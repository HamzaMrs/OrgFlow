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

const app = express();

app.use(helmet());

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

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/analytics", analyticsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[orgflow-api] listening on http://0.0.0.0:${env.PORT}`);
});
