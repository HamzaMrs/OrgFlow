import { Pool } from "pg";
import { env } from "../config/env";

// Enable SSL for managed Postgres providers (Supabase, Neon, RDS, etc.).
// Supabase pooled connection strings (`...pooler.supabase.com`) already include
// `sslmode=require`, but we also force a permissive SSL config in production in
// case the connection string omits it.
const isManagedPostgres = /supabase\.co|neon\.tech|amazonaws\.com|render\.com/.test(
  env.DATABASE_URL,
);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: 30_000,
  ssl:
    env.NODE_ENV === "production" || isManagedPostgres
      ? { rejectUnauthorized: false }
      : undefined,
});

pool.on("error", (err) => {
  console.error("[db] unexpected pool error", err);
});

export async function query<T = unknown>(
  text: string,
  params?: readonly unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await pool.query(text, params as unknown[]);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}
