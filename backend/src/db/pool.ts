import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
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
