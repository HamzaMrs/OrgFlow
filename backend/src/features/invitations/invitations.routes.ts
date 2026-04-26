import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { strongPassword } from "../../utils/schemas";
import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  listInvitations,
  revokeInvitation,
} from "./invitations.service";
import { notFound } from "../../utils/httpError";

export const invitationsRouter = Router();

const tokenParam = z.object({ token: z.string().min(1) });
const idParam = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  department_id: z.string().uuid().nullable().optional(),
});

const acceptSchema = z.object({
  name: z.string().min(1).max(120),
  password: strongPassword,
});

// Public route — used by the accept page to show invitation details before
// the user types their password. No auth required.
invitationsRouter.get(
  "/by-token/:token",
  validate(tokenParam, "params"),
  asyncHandler(async (req, res) => {
    const { token } = req.params as z.infer<typeof tokenParam>;
    const invitation = await getInvitationByToken(token);
    if (!invitation) throw notFound("Invitation introuvable ou expirée");
    res.json(invitation);
  }),
);

invitationsRouter.post(
  "/by-token/:token/accept",
  authLimiter,
  validate(tokenParam, "params"),
  validate(acceptSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.params as z.infer<typeof tokenParam>;
    const body = req.body as z.infer<typeof acceptSchema>;
    const result = await acceptInvitation({ token, ...body });
    res.status(201).json(result);
  }),
);

// Admin-only management endpoints.
invitationsRouter.use(requireAuth, requireRole("admin"));

invitationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const list = await listInvitations();
    res.json(list);
  }),
);

invitationsRouter.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const inviter = req.user!;
    const invitation = await createInvitation({
      email: body.email,
      role: body.role,
      department_id: body.department_id ?? null,
      invited_by: inviter.id,
      inviter_name: inviter.name,
    });
    res.status(201).json(invitation);
  }),
);

invitationsRouter.delete(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    await revokeInvitation(id);
    res.status(204).end();
  }),
);
