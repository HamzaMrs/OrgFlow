import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { strongPassword } from "../../utils/schemas";
import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "./auth.service";

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

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string().min(1),
  password: strongPassword,
});

const tokenParam = z.object({ token: z.string().min(1) });

const resendSchema = z.object({ email: z.string().email() });

// In production the frontend (Vercel) and the backend (Render) live on
// different eTLD+1s, so cookies have to be set with SameSite=None+Secure to be
// sent on cross-site XHR. In development we keep SameSite=lax over plain http.
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
};

const cookieMaxAge = 60 * 60 * 1000;

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await login(email, password);
    res.cookie("token", result.token, { ...cookieOpts, maxAge: cookieMaxAge });
    res.json({ user: result.user, token: result.token });
  }),
);

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof registerSchema>;
    const result = await register(body);
    res.cookie("token", result.token, { ...cookieOpts, maxAge: cookieMaxAge });
    res.status(201).json({ user: result.user, token: result.token });
  }),
);

authRouter.post(
  "/logout",
  (_req, res) => {
    res.clearCookie("token", cookieOpts);
    res.json({ message: "Déconnecté" });
  },
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Fetch fresh user data so email_verified flips immediately after the
    // user clicks the link in their inbox, without waiting for a new login.
    const { query } = await import("../../db/pool");
    const { rows } = await query<{
      id: string;
      name: string;
      email: string;
      role: string;
      email_verified: boolean;
    }>(
      `SELECT id, name, email, role, email_verified FROM users WHERE id = $1`,
      [req.user!.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(rows[0]);
  }),
);

authRouter.post(
  "/verify-email/:token",
  validate(tokenParam, "params"),
  asyncHandler(async (req, res) => {
    const { token } = req.params as z.infer<typeof tokenParam>;
    const user = await verifyEmail(token);
    res.json({ user });
  }),
);

authRouter.post(
  "/resend-verification",
  authLimiter,
  validate(resendSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof resendSchema>;
    await resendVerification(email);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof forgotSchema>;
    await forgotPassword(email);
    // Same response whether the email exists or not.
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof resetSchema>;
    const result = await resetPassword(body);
    const { token, ...user } = result;
    res.cookie("token", token, { ...cookieOpts, maxAge: cookieMaxAge });
    res.json({ user, token });
  }),
);
