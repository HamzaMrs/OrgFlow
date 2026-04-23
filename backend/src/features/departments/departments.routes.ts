import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { notFound } from "../../utils/httpError";

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

const updateSchema = createSchema.partial();

const idParam = z.object({ id: z.string().uuid() });

departmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT d.id, d.name, d.description, d.created_at,
              COUNT(u.id)::int AS member_count
         FROM departments d
         LEFT JOIN users u ON u.department_id = d.id
         GROUP BY d.id
         ORDER BY d.name ASC`,
    );
    res.json(rows);
  }),
);

departmentsRouter.post(
  "/",
  requireRole("admin", "manager"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body as z.infer<typeof createSchema>;
    const { rows } = await query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name, description ?? null],
    );
    res.status(201).json(rows[0]);
  }),
);

departmentsRouter.patch(
  "/:id",
  requireRole("admin", "manager"),
  validate(idParam, "params"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const body = req.body as z.infer<typeof updateSchema>;
    const { rows } = await query(
      `UPDATE departments
          SET name = COALESCE($2, name),
              description = COALESCE($3, description)
        WHERE id = $1
        RETURNING id, name, description, created_at`,
      [id, body.name ?? null, body.description ?? null],
    );
    if (rows.length === 0) throw notFound("Department not found");
    res.json(rows[0]);
  }),
);

departmentsRouter.delete(
  "/:id",
  requireRole("admin"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const result = await query("DELETE FROM departments WHERE id = $1", [id]);
    if (result.rowCount === 0) throw notFound("Department not found");
    res.status(204).end();
  }),
);
