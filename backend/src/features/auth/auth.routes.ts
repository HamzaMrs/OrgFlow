import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { strongPassword } from "../../utils/schemas";
import { login, register } from "./auth.service";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: strongPassword,
});

// In production the frontend (Vercel) and the backend (Render) live on
// different eTLD+1s, so cookies have to be set with SameSite=None+Secure to be
// sent on cross-site XHR. In development we keep SameSite=lax over plain http.
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
};

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await login(email, password);
    res.cookie("token", result.token, {
      ...cookieOpts,
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.json({ user: result.user });
  }),
);

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof registerSchema>;
    const user = await register(body);
    res.status(201).json(user);
  }),
);

authRouter.post(
  "/logout",
  (_req, res) => {
    res.clearCookie("token", cookieOpts);
    res.json({ message: "Déconnecté" });
  }
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  }),
);
