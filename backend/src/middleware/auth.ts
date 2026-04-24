import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../utils/httpError";

export type UserRole = "admin" | "manager" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined = req.cookies?.token;

  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.slice("Bearer ".length).trim();
    }
  }

  if (!token) {
    return next(unauthorized("Jeton d'authentification manquant"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser & { iat: number; exp: number };
    req.user = { id: payload.id, email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch {
    next(unauthorized("Jeton invalide ou expiré"));
  }
}

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized("Non autorisé"));
    if (!roles.includes(req.user.role)) return next(forbidden("Rôle insuffisant"));
    next();
  };
