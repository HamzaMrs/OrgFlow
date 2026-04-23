import { Router } from "express";
import { query } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [{ rows: counters }, { rows: projectStatus }, { rows: taskStatus }, { rows: workload }, { rows: completion }] =
      await Promise.all([
        query<{ total_projects: number; total_tasks: number; total_users: number; total_departments: number }>(
          `SELECT
              (SELECT COUNT(*)::int FROM projects) AS total_projects,
              (SELECT COUNT(*)::int FROM tasks) AS total_tasks,
              (SELECT COUNT(*)::int FROM users) AS total_users,
              (SELECT COUNT(*)::int FROM departments) AS total_departments`,
        ),
        query(
          `SELECT status, COUNT(*)::int AS count
             FROM projects
            GROUP BY status
            ORDER BY status`,
        ),
        query(
          `SELECT status, COUNT(*)::int AS count
             FROM tasks
            GROUP BY status
            ORDER BY status`,
        ),
        query(
          `SELECT u.id, u.name, u.role,
                  COUNT(t.id)::int AS total_tasks,
                  COUNT(t.id) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
                  COUNT(t.id) FILTER (WHERE t.status = 'todo')::int AS todo,
                  COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done
             FROM users u
             LEFT JOIN tasks t ON t.assignee_id = u.id
            GROUP BY u.id
            ORDER BY total_tasks DESC, u.name ASC
            LIMIT 10`,
        ),
        query(
          `SELECT p.id, p.name,
                  COUNT(t.id)::int AS total,
                  COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done
             FROM projects p
             LEFT JOIN tasks t ON t.project_id = p.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 10`,
        ),
      ]);

    res.json({
      counters: counters[0],
      projectStatus,
      taskStatus,
      workload,
      completion: completion.map((row) => ({
        ...row,
        rate: row.total > 0 ? Math.round((row.done / row.total) * 100) : 0,
      })),
    });
  }),
);
