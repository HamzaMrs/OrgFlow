import { Resend } from "resend";
import { env } from "../config/env";

// Lazy-init the Resend client so a missing key doesn't crash module load.
// When the key is absent we fall back to logging the email body to the console,
// which keeps local dev usable and gives a clear breadcrumb in prod logs.
let client: Resend | null = null;
function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn(
      `[mail] RESEND_API_KEY not set — would send to ${to}: ${subject}`,
    );
    console.warn(`[mail] body:\n${text}`);
    return;
  }

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error("[mail] resend error", result.error);
      return;
    }
    console.log(`[mail] sent ${result.data?.id} to ${to}: ${subject}`);
  } catch (err) {
    // Never let mail failures bubble up and break the user-visible request.
    // Verification / reset can be retried from the UI.
    console.error("[mail] send failed", err);
  }
}

// ---------------------------------------------------------------------------
// Template helpers — keep markup small so it renders well in every client.
// ---------------------------------------------------------------------------

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;`;
const buttonStyle = `display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;font-size:14px;`;
const mutedStyle = `color:#666;font-size:13px;`;

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fafafa;"><div style="${baseStyle}"><h1 style="font-size:20px;margin:0 0 16px;">${escape(title)}</h1>${body}<hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px"/><p style="${mutedStyle}">OrgFlow · si vous n'attendiez pas ce message, ignorez-le simplement.</p></div></body></html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const link = `${env.APP_URL}/verify-email/${args.token}`;
  const html = wrap(
    "Confirmez votre adresse",
    `<p>Bonjour ${escape(args.name)},</p>
     <p>Bienvenue sur OrgFlow. Confirmez votre adresse pour activer votre compte :</p>
     <p style="margin:24px 0"><a href="${link}" style="${buttonStyle}">Confirmer mon email</a></p>
     <p style="${mutedStyle}">Ou copiez ce lien dans votre navigateur :<br/><a href="${link}" style="word-break:break-all">${link}</a></p>
     <p style="${mutedStyle}">Ce lien expire dans 24 heures.</p>`,
  );
  const text = `Bonjour ${args.name},\n\nConfirmez votre email OrgFlow : ${link}\n\nCe lien expire dans 24 heures.`;
  await send({ to: args.to, subject: "Confirmez votre adresse OrgFlow", html, text });
}

export async function sendPasswordResetEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const link = `${env.APP_URL}/reset-password/${args.token}`;
  const html = wrap(
    "Réinitialisation de mot de passe",
    `<p>Bonjour ${escape(args.name)},</p>
     <p>Vous avez demandé à réinitialiser votre mot de passe OrgFlow. Cliquez ci-dessous pour en choisir un nouveau :</p>
     <p style="margin:24px 0"><a href="${link}" style="${buttonStyle}">Choisir un nouveau mot de passe</a></p>
     <p style="${mutedStyle}">Ou copiez ce lien :<br/><a href="${link}" style="word-break:break-all">${link}</a></p>
     <p style="${mutedStyle}">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez ce message.</p>`,
  );
  const text = `Bonjour ${args.name},\n\nRéinitialisez votre mot de passe OrgFlow : ${link}\n\nCe lien expire dans 1 heure.`;
  await send({ to: args.to, subject: "Réinitialisation de votre mot de passe", html, text });
}

export async function sendInvitationEmail(args: {
  to: string;
  inviterName: string;
  token: string;
  role: string;
}): Promise<void> {
  const link = `${env.APP_URL}/accept-invitation/${args.token}`;
  const roleLabel: Record<string, string> = {
    admin: "administrateur",
    manager: "manager",
    employee: "employé",
  };
  const role = roleLabel[args.role] ?? args.role;
  const html = wrap(
    `${escape(args.inviterName)} vous invite sur OrgFlow`,
    `<p>${escape(args.inviterName)} vous invite à rejoindre OrgFlow en tant que <strong>${escape(role)}</strong>.</p>
     <p>Pour accepter, cliquez sur le lien et choisissez un mot de passe :</p>
     <p style="margin:24px 0"><a href="${link}" style="${buttonStyle}">Accepter l'invitation</a></p>
     <p style="${mutedStyle}">Ou copiez ce lien :<br/><a href="${link}" style="word-break:break-all">${link}</a></p>
     <p style="${mutedStyle}">Cette invitation expire dans 7 jours.</p>`,
  );
  const text = `${args.inviterName} vous invite sur OrgFlow en tant que ${role}.\n\nAcceptez l'invitation : ${link}\n\nCe lien expire dans 7 jours.`;
  await send({ to: args.to, subject: `Invitation à rejoindre OrgFlow`, html, text });
}
