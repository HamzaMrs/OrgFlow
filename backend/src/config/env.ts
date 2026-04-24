import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET", "change-me-in-production"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  // In production (Vercel with experimentalServices), frontend and backend share
  // the same origin, so CORS isn't strictly required. We still accept a
  // comma-separated list + allow *.vercel.app previews by default.
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ??
    "http://localhost:5173,https://org-flow-eight.vercel.app",
};
