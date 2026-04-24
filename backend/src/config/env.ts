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
  // In production (Vercel with experimentalServices), frontend and backend share
  // the same origin, so CORS isn't strictly required. We still accept a
  // comma-separated list + allow *.vercel.app previews by default.
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ??
    "http://localhost:5173,https://org-flow-eight.vercel.app",
  BCRYPT_COST: Number(process.env.BCRYPT_COST ?? 12),
};
