import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { query } from "../../db/pool";
import { badRequest, conflict, unauthorized } from "../../utils/httpError";
import type { UserRole } from "../../middleware/auth";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../services/mail";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  email_verified: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
}

function signToken(user: Pick<UserRow, "id" | "email" | "role" | "name">): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

function publicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    email_verified: u.email_verified,
  };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function login(email: string, password: string) {
  const { rows } = await query<UserRow>(
    "SELECT id, name, email, password_hash, role, email_verified FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user) throw unauthorized("Identifiants invalides");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw unauthorized("Identifiants invalides");

  return { token: signToken(user), user: publicUser(user) };
}

/**
 * Public sign-up. The first ever user becomes admin so a fresh deployment is
 * usable without seed data; everyone after that lands as employee. The caller
 * receives a JWT immediately so they can use the app — verification is a soft
 * gate (we surface a banner in the UI) rather than a blocker.
 */
export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await query("SELECT 1 FROM users WHERE email = $1", [input.email]);
  if (existing.rowCount > 0) throw conflict("Adresse e-mail déjà enregistrée");

  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_COST);

  const { rows: countRows } = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users",
  );
  const isFirstUser = countRows[0]?.count === "0";
  const role: UserRole = isFirstUser ? "admin" : "employee";

  const verification_token = generateToken();
  const verification_token_expires = new Date(Date.now() + DAY);

  const { rows } = await query<UserRow>(
    `INSERT INTO users
       (name, email, password_hash, role, email_verified, verification_token, verification_token_expires)
     VALUES ($1, $2, $3, $4, FALSE, $5, $6)
     RETURNING id, name, email, password_hash, role, email_verified`,
    [
      input.name,
      input.email,
      password_hash,
      role,
      verification_token,
      verification_token_expires,
    ],
  );
  const user = rows[0];

  // Fire-and-forget — mail.send swallows its own errors so a Resend hiccup
  // never blocks sign-up. The user can hit "renvoyer le mail" from the UI.
  void sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verification_token,
  });

  return { token: signToken(user), user: publicUser(user) };
}

export async function verifyEmail(token: string): Promise<PublicUser> {
  const { rows } = await query<UserRow & { verification_token_expires: Date }>(
    `SELECT id, name, email, password_hash, role, email_verified, verification_token_expires
       FROM users
      WHERE verification_token = $1`,
    [token],
  );
  const user = rows[0];
  if (!user) throw badRequest("Lien de confirmation invalide");
  if (user.email_verified) return publicUser(user);

  const expired =
    user.verification_token_expires && new Date(user.verification_token_expires).getTime() < Date.now();
  if (expired) throw badRequest("Le lien de confirmation a expiré");

  await query(
    `UPDATE users
        SET email_verified = TRUE,
            verification_token = NULL,
            verification_token_expires = NULL
      WHERE id = $1`,
    [user.id],
  );
  return { ...publicUser(user), email_verified: true };
}

export async function resendVerification(email: string): Promise<void> {
  const { rows } = await query<UserRow>(
    "SELECT id, name, email, password_hash, role, email_verified FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user || user.email_verified) {
    // Don't leak which emails are registered — succeed silently.
    return;
  }
  const verification_token = generateToken();
  const expires = new Date(Date.now() + DAY);
  await query(
    `UPDATE users
        SET verification_token = $2,
            verification_token_expires = $3
      WHERE id = $1`,
    [user.id, verification_token, expires],
  );
  void sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verification_token,
  });
}

/**
 * Always succeeds, even when the email is unknown — that prevents the
 * endpoint from doubling as an email-enumeration oracle.
 */
export async function forgotPassword(email: string): Promise<void> {
  const { rows } = await query<UserRow>(
    "SELECT id, name, email, password_hash, role, email_verified FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user) return;

  const password_reset_token = generateToken();
  const password_reset_expires = new Date(Date.now() + HOUR);
  await query(
    `UPDATE users
        SET password_reset_token = $2,
            password_reset_expires = $3
      WHERE id = $1`,
    [user.id, password_reset_token, password_reset_expires],
  );
  void sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    token: password_reset_token,
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<PublicUser & { token: string }> {
  const { rows } = await query<UserRow & { password_reset_expires: Date }>(
    `SELECT id, name, email, password_hash, role, email_verified, password_reset_expires
       FROM users
      WHERE password_reset_token = $1`,
    [input.token],
  );
  const user = rows[0];
  if (!user) throw badRequest("Lien de réinitialisation invalide");

  const expired =
    user.password_reset_expires && new Date(user.password_reset_expires).getTime() < Date.now();
  if (expired) throw badRequest("Le lien de réinitialisation a expiré");

  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_COST);
  await query(
    `UPDATE users
        SET password_hash = $2,
            password_reset_token = NULL,
            password_reset_expires = NULL
      WHERE id = $1`,
    [user.id, password_hash],
  );

  return { ...publicUser(user), token: signToken(user) };
}
