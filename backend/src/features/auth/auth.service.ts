import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { query } from "../../db/pool";
import { conflict, unauthorized } from "../../utils/httpError";
import type { UserRole } from "../../middleware/auth";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
}

export async function login(email: string, password: string) {
  const { rows } = await query<UserRow>(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user) throw unauthorized("Identifiants invalides");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw unauthorized("Identifiants invalides");

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await query("SELECT 1 FROM users WHERE email = $1", [input.email]);
  if (existing.rowCount > 0) throw conflict("Adresse e-mail déjà enregistrée");

  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_COST);
  const role: UserRole = "employee";

  const { rows } = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, password_hash, role`,
    [input.name, input.email, password_hash, role],
  );
  const user = rows[0];
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
