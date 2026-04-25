import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { query } from "../db/pool";
import { forbidden, notFound, unauthorized } from "../utils/httpError";

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

/**
 * Restricts access to a project resource based on membership.
 * - admins and managers: unrestricted
 * - employees: must be the project owner OR a member of `project_members`
 *
 * Returns 404 (not 403) when the employee has no business knowing the project exists.
 */
export const requireMembership =
  (paramName = "id") =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthorized("Non autorisé"));
      if (req.user.role === "admin" || req.user.role === "manager") return next();

      const projectId = req.params[paramName];
      if (!projectId) return next(notFound("Projet introuvable"));

      const { rows } = await query<{ ok: number }>(
        `SELECT 1 AS ok FROM projects WHERE id = $1 AND owner_id = $2
         UNION
         SELECT 1 AS ok FROM project_members WHERE project_id = $1 AND user_id = $2
         LIMIT 1`,
        [projectId, req.user.id],
      );

      if (rows.length === 0) return next(notFound("Projet introuvable"));
      next();
    } catch (err) {
      next(err);
    }
  };
