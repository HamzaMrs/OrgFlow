import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`.",
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1h",
  // Frontend (Vercel) and backend (Render) live on different origins, so we
  // accept a comma-separated allow-list plus any *.vercel.app preview deploy.
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ??
    "http://localhost:5173,https://org-flow-eight.vercel.app",
  BCRYPT_COST: Number(process.env.BCRYPT_COST ?? 12),

  // ---------------------------------------------------------------------
  // Email — pick a transport based on what's configured.
  // Priority: SMTP (Gmail/etc.) → Resend → log-only (dev/no config).
  //
  // SMTP transport: works with any SMTP server. The common setup is Gmail
  // with an App Password (free, no domain required, unlimited recipients
  // up to ~500/day). Set:
  //   SMTP_HOST=smtp.gmail.com
  //   SMTP_PORT=587
  //   SMTP_USER=you@gmail.com
  //   SMTP_PASSWORD=<your 16-char app password>
  //
  // Resend transport: better deliverability with a verified domain, but the
  // free tier is restricted to the account owner's email until you verify.
  //   RESEND_API_KEY=re_xxx
  // ---------------------------------------------------------------------
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? "",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  // The "From" header on outgoing emails. With Gmail SMTP this MUST equal
  // your SMTP_USER (Gmail rewrites From otherwise). With Resend, it must be
  // either onboarding@resend.dev (test mode) or noreply@<verified-domain>.
  EMAIL_FROM: process.env.EMAIL_FROM ?? "",
  // Public URL of the frontend — used to build links inside emails (verify,
  // reset, accept invitation). Must match the Vercel deployment in prod.
  APP_URL: process.env.APP_URL ?? "http://localhost:5173",
};
