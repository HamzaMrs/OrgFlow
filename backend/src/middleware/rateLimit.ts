import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Trust proxy is required when running behind Vercel/Render/Railway so the
// limiter sees the real client IP via X-Forwarded-For. Configured in server.ts.

const fifteenMinutes = 15 * 60 * 1000;

// Strict limiter for credential endpoints: 5 attempts / 15 min / IP.
// Returns the configured i18n message and standard RateLimit-* headers.
export const authLimiter = rateLimit({
  windowMs: fifteenMinutes,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives. Réessayez dans 15 minutes.",
  },
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "unknown")}:${req.body?.email ?? ""}`,
});

// Generic limiter for authenticated API routes — protects against scraping.
// 300 requests / 15 min / IP keyed.
export const apiLimiter = rateLimit({
  windowMs: fifteenMinutes,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Patientez quelques minutes." },
});
