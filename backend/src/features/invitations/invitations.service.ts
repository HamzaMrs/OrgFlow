import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { pool, query } from "../../db/pool";
import { badRequest, conflict, notFound } from "../../utils/httpError";
import type { UserRole } from "../../middleware/auth";
import { sendInvitationEmail } from "../../services/mail";

interface InvitationRow {
  id: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  token: string;
  invited_by: string | null;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
}

export interface InvitationView {
  id: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  department_name: string | null;
  invited_by_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: "pending" | "accepted" | "expired";
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function status(row: { accepted_at: Date | null; expires_at: Date }): InvitationView["status"] {
  if (row.accepted_at) return "accepted";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

export async function listInvitations(): Promise<InvitationView[]> {
  const { rows } = await query<
    InvitationRow & { department_name: string | null; invited_by_name: string | null }
  >(
    `SELECT i.id, i.email, i.role, i.department_id, i.token,
            i.invited_by, i.expires_at, i.accepted_at, i.created_at,
            d.name AS department_name,
            u.name AS invited_by_name
       FROM invitations i
       LEFT JOIN departments d ON d.id = i.department_id
       LEFT JOIN users u ON u.id = i.invited_by
      ORDER BY i.created_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    department_id: r.department_id,
    department_name: r.department_name,
    invited_by_name: r.invited_by_name,
    expires_at: new Date(r.expires_at).toISOString(),
    accepted_at: r.accepted_at ? new Date(r.accepted_at).toISOString() : null,
    created_at: new Date(r.created_at).toISOString(),
    status: status(r),
  }));
}

export async function createInvitation(input: {
  email: string;
  role: UserRole;
  department_id: string | null;
  invited_by: string;
  inviter_name: string;
}): Promise<InvitationView> {
  // Refuse if a verified user already exists with this email.
  const existing = await query("SELECT 1 FROM users WHERE email = $1", [input.email]);
  if (existing.rowCount > 0) throw conflict("Un utilisateur avec cet email existe déjà");

  // If a pending (unaccepted, non-expired) invite exists for this email,
  // refuse — the admin can revoke it explicitly first.
  const pending = await query<InvitationRow>(
    `SELECT * FROM invitations
      WHERE email = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [input.email],
  );
  if (pending.rowCount > 0) {
    throw conflict("Une invitation est déjà en attente pour cet email");
  }

  const token = generateToken();
  const expires_at = new Date(Date.now() + INVITATION_TTL_MS);

  const { rows } = await query<InvitationRow>(
    `INSERT INTO invitations (email, role, department_id, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, role, department_id, token, invited_by, expires_at, accepted_at, created_at`,
    [input.email, input.role, input.department_id, token, input.invited_by, expires_at],
  );
  const row = rows[0];

  void sendInvitationEmail({
    to: row.email,
    inviterName: input.inviter_name,
    token,
    role: row.role,
  });

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
    department_name: null,
    invited_by_name: input.inviter_name,
    expires_at: new Date(row.expires_at).toISOString(),
    accepted_at: null,
    created_at: new Date(row.created_at).toISOString(),
    status: "pending",
  };
}

export async function revokeInvitation(id: string): Promise<void> {
  const result = await query("DELETE FROM invitations WHERE id = $1", [id]);
  if (result.rowCount === 0) throw notFound("Invitation introuvable");
}

/**
 * Public read of an invitation by its token — used by the accept page to show
 * "you've been invited as <role> to <department>". Hides the token itself.
 */
export async function getInvitationByToken(token: string): Promise<{
  email: string;
  role: UserRole;
  department_name: string | null;
  inviter_name: string | null;
} | null> {
  const { rows } = await query<{
    email: string;
    role: UserRole;
    expires_at: Date;
    accepted_at: Date | null;
    department_name: string | null;
    inviter_name: string | null;
  }>(
    `SELECT i.email, i.role, i.expires_at, i.accepted_at,
            d.name AS department_name,
            u.name AS inviter_name
       FROM invitations i
       LEFT JOIN departments d ON d.id = i.department_id
       LEFT JOIN users u ON u.id = i.invited_by
      WHERE i.token = $1`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.accepted_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return {
    email: row.email,
    role: row.role,
    department_name: row.department_name,
    inviter_name: row.inviter_name,
  };
}

interface AcceptResult {
  user: { id: string; name: string; email: string; role: UserRole; email_verified: true };
  token: string;
}

export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}): Promise<AcceptResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inviteResult = await client.query<InvitationRow>(
      `SELECT * FROM invitations WHERE token = $1 FOR UPDATE`,
      [input.token],
    );
    const invite = inviteResult.rows[0];
    if (!invite) {
      throw badRequest("Lien d'invitation invalide");
    }
    if (invite.accepted_at) {
      throw badRequest("Cette invitation a déjà été utilisée");
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw badRequest("Cette invitation a expiré");
    }

    // Reject if a user with that email was created in the meantime.
    const existing = await client.query("SELECT 1 FROM users WHERE email = $1", [invite.email]);
    if ((existing.rowCount ?? 0) > 0) {
      throw conflict("Un utilisateur avec cet email existe déjà");
    }

    const password_hash = await bcrypt.hash(input.password, env.BCRYPT_COST);
    const userResult = await client.query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
    }>(
      `INSERT INTO users
         (name, email, password_hash, role, department_id, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, email, role`,
      [input.name, invite.email, password_hash, invite.role, invite.department_id],
    );
    const user = userResult.rows[0];

    await client.query(
      "UPDATE invitations SET accepted_at = NOW() WHERE id = $1",
      [invite.id],
    );

    await client.query("COMMIT");

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
    );

    return {
      user: { ...user, email_verified: true as const },
      token,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
