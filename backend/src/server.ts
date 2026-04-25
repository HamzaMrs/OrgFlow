import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authRouter } from "./features/auth/auth.routes";
import { usersRouter } from "./features/users/users.routes";
import { departmentsRouter } from "./features/departments/departments.routes";
import { projectsRouter } from "./features/projects/projects.routes";
import { analyticsRouter } from "./features/analytics/analytics.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { pool } from "./db/pool";
import cookieParser from "cookie-parser";

export const app = express();

// Trust the proxy in front of us (Vercel/Render/Railway). Required so
// `req.ip` reflects the real client IP from `X-Forwarded-For` rather than the
// proxy's IP — otherwise rate-limiting buckets every request into the same key.
app.set("trust proxy", 1);

// Disable Express's automatic ETag generation. Without this Express can return
// 304 Not Modified on JSON responses, and the browser then serves an empty body
// from cache — which breaks the SPA when it tries to read fields like
// `data.projectStatus.map(...)` on what it thinks is JSON but is actually empty.
app.set("etag", false);

// Force every API response to bypass intermediate caches. Vercel's edge can
// otherwise cache 200 responses and surface them as 304s on the next request.
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(cookieParser());

// Helmet with stricter cross-origin defaults. We don't serve cross-origin assets
// from this API, so locking these down adds a small but free layer.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return cb(null, true);
      // Allow configured origins + any *.vercel.app preview deploy
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
        return cb(null, true);
      }
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "orgflow-api", time: new Date().toISOString() });
});

const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
// Generic limiter on all authenticated APIs to prevent abuse / scraping.
apiRouter.use("/users", apiLimiter, usersRouter);
apiRouter.use("/departments", apiLimiter, departmentsRouter);
apiRouter.use("/projects", apiLimiter, projectsRouter);
apiRouter.use("/analytics", apiLimiter, analyticsRouter);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    console.log(`[orgflow-api] listening on http://0.0.0.0:${env.PORT}`);
  });

  // Graceful shutdown: stop accepting new connections, drain the pool, then exit.
  // Without this, the pg pool can leak when the process is sent SIGTERM (e.g.
  // during a deploy / container replace) and clients see broken connections.
  const shutdown = (signal: string) => {
    console.log(`[orgflow-api] received ${signal}, shutting down...`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    // Hard timeout in case something hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export default app;
