import { Router } from "express";
import { z } from "zod";
import { pool, query } from "../../db/pool";
import { requireAuth, requireMembership, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { notFound } from "../../utils/httpError";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

const statusEnum = z.enum(["todo", "in_progress", "done"]);

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: statusEnum.default("todo"),
  owner_id: z.string().uuid().optional().nullable(),
  start_date: z.string().date().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  member_ids: z.array(z.string().uuid()).optional().default([]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: statusEnum.optional(),
  owner_id: z.string().uuid().nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  due_date: z.string().date().nullable().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

async function hydrateProject(projectId: string) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.description, p.status, p.owner_id,
            p.start_date, p.due_date, p.created_at, p.updated_at,
            o.name AS owner_name,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', u.id, 'name', u.name, 'email', u.email, 'role', u.role
               ) ORDER BY u.name)
                 FROM project_members pm
                 JOIN users u ON u.id = pm.user_id
                WHERE pm.project_id = p.id),
              '[]'::json
            ) AS members,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS tasks_done
       FROM projects p
       LEFT JOIN users o ON o.id = p.owner_id
      WHERE p.id = $1`,
    [projectId],
  );
  return rows[0] ?? null;
}

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const caller = req.user!;
    let queryStr = `
      SELECT p.id, p.name, p.description, p.status, p.owner_id,
             p.start_date, p.due_date, p.created_at, p.updated_at,
             o.name AS owner_name,
             COALESCE(
               (SELECT json_agg(json_build_object(
                  'id', u.id, 'name', u.name, 'email', u.email, 'role', u.role
                ) ORDER BY u.name)
                  FROM project_members pm
                  JOIN users u ON u.id = pm.user_id
                 WHERE pm.project_id = p.id),
               '[]'::json
             ) AS members,
             COUNT(DISTINCT t.id)::int AS task_count,
             COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done')::int AS tasks_done
        FROM projects p
        LEFT JOIN users o ON o.id = p.owner_id
        LEFT JOIN tasks t ON t.project_id = p.id
    `;
    const params: any[] = [];
    if (caller.role === "employee") {
      queryStr += `
        WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
           OR p.owner_id = $1
      `;
      params.push(caller.id);
    }
    queryStr += ` GROUP BY p.id, o.name ORDER BY p.created_at DESC`;
    const { rows } = await query(queryStr, params);
    res.json(rows);
  }),
);

projectsRouter.get(
  "/:id",
  validate(idParam, "params"),
  requireMembership("id"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const project = await hydrateProject(id);
    if (!project) throw notFound("Projet introuvable");
    res.json(project);
  }),
);

projectsRouter.post(
  "/",
  requireRole("admin", "manager"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO projects (name, description, status, owner_id, start_date, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          body.name,
          body.description ?? null,
          body.status,
          body.owner_id ?? null,
          body.start_date ?? null,
          body.due_date ?? null,
        ],
      );
      const projectId = rows[0].id as string;

      if (body.member_ids && body.member_ids.length > 0) {
        const values = body.member_ids
          .map((_: string, i: number) => `($1, $${i + 2})`)
          .join(", ");
        await client.query(
          `INSERT INTO project_members (project_id, user_id) VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [projectId, ...body.member_ids],
        );
      }

      await client.query("COMMIT");
      const project = await hydrateProject(projectId);
      res.status(201).json(project);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

projectsRouter.patch(
  "/:id",
  requireRole("admin", "manager"),
  validate(idParam, "params"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const body = req.body as z.infer<typeof updateSchema>;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const updates: string[] = [];
      const values: any[] = [id];
      let paramIdx = 2;

      if (body.name !== undefined) { updates.push(`name = $${paramIdx++}`); values.push(body.name); }
      if (body.description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(body.description); }
      if (body.status !== undefined) { updates.push(`status = $${paramIdx++}`); values.push(body.status); }
      if (body.owner_id !== undefined) { updates.push(`owner_id = $${paramIdx++}`); values.push(body.owner_id); }
      if (body.start_date !== undefined) { updates.push(`start_date = $${paramIdx++}`); values.push(body.start_date); }
      if (body.due_date !== undefined) { updates.push(`due_date = $${paramIdx++}`); values.push(body.due_date); }

      if (updates.length > 0) {
        updates.push("updated_at = NOW()");
        const result = await client.query(
          `UPDATE projects SET ${updates.join(", ")} WHERE id = $1 RETURNING id`,
          values
        );
        if (result.rowCount === 0) throw notFound("Projet introuvable");
      }

      if (body.member_ids) {
        await client.query("DELETE FROM project_members WHERE project_id = $1", [id]);
        if (body.member_ids.length > 0) {
          const values = body.member_ids
            .map((_: string, i: number) => `($1, $${i + 2})`)
            .join(", ");
          await client.query(
            `INSERT INTO project_members (project_id, user_id) VALUES ${values}
             ON CONFLICT DO NOTHING`,
            [id, ...body.member_ids],
          );
        }
      }

      await client.query("COMMIT");
      const project = await hydrateProject(id);
      if (!project) throw notFound("Projet introuvable");
      res.json(project);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

projectsRouter.delete(
  "/:id",
  requireRole("admin", "manager"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const result = await query("DELETE FROM projects WHERE id = $1", [id]);
    if (result.rowCount === 0) throw notFound("Projet introuvable");
    res.status(204).end();
  }),
);

// Tasks nested under projects
const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: statusEnum.default("todo"),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
});

const taskUpdateSchema = taskCreateSchema.partial();

projectsRouter.get(
  "/:id/tasks",
  validate(idParam, "params"),
  requireMembership("id"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;

    const { rows } = await query(
      `SELECT t.id, t.title, t.description, t.status, t.assignee_id,
              t.due_date, t.created_at, t.updated_at,
              u.name AS assignee_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.project_id = $1
        ORDER BY t.created_at ASC`,
      [id],
    );
    res.json(rows);
  }),
);

projectsRouter.post(
  "/:id/tasks",
  validate(idParam, "params"),
  requireMembership("id"),
  validate(taskCreateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const body = req.body as z.infer<typeof taskCreateSchema>;
    const { rows } = await query(
      `INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, title, description, status, assignee_id, due_date, created_at, updated_at`,
      [
        id,
        body.title,
        body.description ?? null,
        body.status,
        body.assignee_id ?? null,
        body.due_date ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  }),
);

const taskIdParam = z.object({ id: z.string().uuid(), taskId: z.string().uuid() });

projectsRouter.patch(
  "/:id/tasks/:taskId",
  validate(taskIdParam, "params"),
  requireMembership("id"),
  validate(taskUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id, taskId } = req.params as z.infer<typeof taskIdParam>;
    const body = req.body as z.infer<typeof taskUpdateSchema>;

    const updates: string[] = [];
    const values: any[] = [id, taskId];
    let paramIdx = 3;

    if (body.title !== undefined) { updates.push(`title = $${paramIdx++}`); values.push(body.title); }
    if (body.description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(body.description); }
    if (body.status !== undefined) { updates.push(`status = $${paramIdx++}`); values.push(body.status); }
    if (body.assignee_id !== undefined) { updates.push(`assignee_id = $${paramIdx++}`); values.push(body.assignee_id); }
    if (body.due_date !== undefined) { updates.push(`due_date = $${paramIdx++}`); values.push(body.due_date); }

    if (updates.length === 0) {
      const { rows } = await query(`SELECT * FROM tasks WHERE id = $2 AND project_id = $1`, [id, taskId]);
      if (rows.length === 0) throw notFound("Tâche introuvable");
      return res.json(rows[0]);
    }

    updates.push("updated_at = NOW()");

    const { rows } = await query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = $2 AND project_id = $1 RETURNING id, project_id, title, description, status, assignee_id, due_date, created_at, updated_at`,
      values
    );

    if (rows.length === 0) throw notFound("Tâche introuvable");
    res.json(rows[0]);
  }),
);

projectsRouter.delete(
  "/:id/tasks/:taskId",
  validate(taskIdParam, "params"),
  requireMembership("id"),
  asyncHandler(async (req, res) => {
    const { id, taskId } = req.params as z.infer<typeof taskIdParam>;
    const result = await query("DELETE FROM tasks WHERE id = $1 AND project_id = $2", [
      taskId,
      id,
    ]);
    if (result.rowCount === 0) throw notFound("Tâche introuvable");
    res.status(204).end();
  }),
);
