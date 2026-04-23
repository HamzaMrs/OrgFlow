import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../../db/pool";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { conflict, notFound } from "../../utils/httpError";

export const usersRouter = Router();

usersRouter.use(requireAuth);

const roleEnum = z.enum(["admin", "manager", "employee"]);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: roleEnum.default("employee"),
  job_title: z.string().max(120).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: roleEnum.optional(),
  job_title: z.string().max(120).nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

const userSelect = `
  u.id, u.name, u.email, u.role, u.job_title, u.department_id,
  d.name AS department_name, u.created_at
`;

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT ${userSelect}
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         ORDER BY u.name ASC`,
    );
    res.json(rows);
  }),
);

usersRouter.get(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const { rows } = await query(
      `SELECT ${userSelect}
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = $1`,
      [id],
    );
    if (rows.length === 0) throw notFound("User not found");
    res.json(rows[0]);
  }),
);

usersRouter.post(
  "/",
  requireRole("admin"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const exists = await query("SELECT 1 FROM users WHERE email = $1", [body.email]);
    if (exists.rowCount > 0) throw conflict("Email already registered");

    const password_hash = await bcrypt.hash(body.password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, job_title, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, job_title, department_id, created_at`,
      [
        body.name,
        body.email,
        password_hash,
        body.role,
        body.job_title ?? null,
        body.department_id ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  }),
);

usersRouter.patch(
  "/:id",
  requireRole("admin", "manager"),
  validate(idParam, "params"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const body = req.body as z.infer<typeof updateSchema>;

    const password_hash = body.password ? await bcrypt.hash(body.password, 10) : null;

    const { rows } = await query(
      `UPDATE users
          SET name          = COALESCE($2, name),
              role          = COALESCE($3, role),
              job_title     = COALESCE($4, job_title),
              department_id = COALESCE($5, department_id),
              password_hash = COALESCE($6, password_hash),
              updated_at    = NOW()
        WHERE id = $1
        RETURNING id, name, email, role, job_title, department_id, created_at`,
      [
        id,
        body.name ?? null,
        body.role ?? null,
        body.job_title ?? null,
        body.department_id ?? null,
        password_hash,
      ],
    );
    if (rows.length === 0) throw notFound("User not found");
    res.json(rows[0]);
  }),
);

usersRouter.delete(
  "/:id",
  requireRole("admin"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const result = await query("DELETE FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) throw notFound("User not found");
    res.status(204).end();
  }),
);
