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

  // Resend email service. Optional — when not set, the backend logs the email
  // contents instead of sending them, which is handy for local development
  // and acts as a safety net so missing config never crashes a request.
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  // The "From" header on outgoing emails. Resend's free tier ships with the
  // test sender `onboarding@resend.dev`; switch to a verified domain (e.g.
  // `noreply@yourdomain.com`) once you've added one in Resend.
  EMAIL_FROM: process.env.EMAIL_FROM ?? "OrgFlow <onboarding@resend.dev>",
  // Public URL of the frontend — used to build links inside emails (verify,
  // reset, accept invitation). Must match the Vercel deployment in prod.
  APP_URL: process.env.APP_URL ?? "http://localhost:5173",
};
