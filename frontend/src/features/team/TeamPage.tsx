import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, Pencil, Trash2, UserPlus } from "lucide-react";
import { api, apiError } from "../../api/client";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import type { Department, Invitation, User, UserRole } from "../../types/models";

interface EditFormState {
  name: string;
  password: string;
  role: UserRole;
  job_title: string;
  department_id: string;
}

interface InviteFormState {
  email: string;
  role: UserRole;
  department_id: string;
}

const emptyEdit: EditFormState = {
  name: "",
  password: "",
  role: "employee",
  job_title: "",
  department_id: "",
};

const emptyInvite: InviteFormState = {
  email: "",
  role: "employee",
  department_id: "",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  employee: "Employé",
};

const roleStyles: Record<UserRole, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  manager: "border-blue-200 bg-blue-50 text-blue-700",
  employee: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

const statusStyles: Record<Invitation["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-neutral-200 bg-neutral-50 text-neutral-500",
};

const statusLabel: Record<Invitation["status"], string> = {
  pending: "En attente",
  accepted: "Acceptée",
  expired: "Expirée",
};

export default function TeamPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const canEdit = hasRole("admin", "manager");

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InviteFormState>(emptyInvite);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditFormState>(emptyEdit);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function refresh() {
    const calls: Promise<unknown>[] = [
      api.get<User[]>("/users").then((r) => setUsers(r.data)),
      api.get<Department[]>("/departments").then((r) => setDepartments(r.data)),
    ];
    if (isAdmin) {
      calls.push(
        api.get<Invitation[]>("/invitations").then((r) => setInvitations(r.data)),
      );
    }
    await Promise.all(calls);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Invite -----------------------------------------------------------
  function openInvite() {
    setInvite(emptyInvite);
    setInviteError(null);
    setInviteOpen(true);
  }

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      await api.post("/invitations", {
        email: invite.email,
        role: invite.role,
        department_id: invite.department_id || null,
      });
      setInviteOpen(false);
      await refresh();
    } catch (err) {
      setInviteError(apiError(err));
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function revokeInvitation(id: string) {
    if (!confirm("Annuler cette invitation ?")) return;
    try {
      await api.delete(`/invitations/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  // ----- Edit -------------------------------------------------------------
  function openEdit(user: User) {
    setEditingId(user.id);
    setEdit({
      name: user.name,
      password: "",
      role: user.role,
      job_title: user.job_title ?? "",
      department_id: user.department_id ?? "",
    });
    setEditOpen(true);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: edit.name,
        role: edit.role,
        job_title: edit.job_title || null,
        department_id: edit.department_id || null,
      };
      if (edit.password) payload.password = edit.password;
      await api.patch(`/users/${editingId}`, payload);
      setEditOpen(false);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await api.delete(`/users/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        description={`${users.length} ${users.length <= 1 ? "personne" : "personnes"} dans votre organisation.`}
        actions={
          isAdmin ? (
            <button className="btn-primary" onClick={openInvite}>
              <UserPlus className="h-4 w-4" />
              Inviter
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="surface flex items-center justify-center py-24 text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <>
          {isAdmin && invitations.filter((i) => i.status !== "accepted").length > 0 && (
            <div className="surface mb-4 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 text-[0.6875rem] font-medium uppercase tracking-wider text-neutral-500">
                <Mail className="h-3 w-3" />
                Invitations
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    {invitations
                      .filter((i) => i.status !== "accepted")
                      .map((inv, idx, arr) => (
                        <tr
                          key={inv.id}
                          className={idx < arr.length - 1 ? "border-b border-neutral-100" : ""}
                        >
                          <Td>
                            <div className="font-medium text-neutral-900">{inv.email}</div>
                            <div className="text-xs text-neutral-500">
                              Invité par {inv.invited_by_name ?? "—"}
                            </div>
                          </Td>
                          <Td>
                            <span className={`badge ${roleStyles[inv.role]}`}>
                              {ROLE_LABEL[inv.role]}
                            </span>
                          </Td>
                          <Td className="text-neutral-600">
                            {inv.department_name ?? "—"}
                          </Td>
                          <Td>
                            <span className={`badge ${statusStyles[inv.status]}`}>
                              {statusLabel[inv.status]}
                            </span>
                          </Td>
                          <Td className="text-right">
                            <button
                              className="btn-ghost btn-xs text-red-600 hover:bg-red-50"
                              onClick={() => revokeInvitation(inv.id)}
                              aria-label="Annuler"
                              title="Annuler l'invitation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50">
                    <Th>Nom</Th>
                    <Th>Rôle</Th>
                    <Th>Titre</Th>
                    <Th>Département</Th>
                    {canEdit && <Th className="w-px text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={idx < users.length - 1 ? "border-b border-neutral-100" : ""}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[0.625rem] font-semibold text-white">
                            {user.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900">{user.name}</div>
                            <div className="text-xs text-neutral-500">{user.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className={`badge ${roleStyles[user.role]}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </Td>
                      <Td className="text-neutral-600">{user.job_title ?? "—"}</Td>
                      <Td className="text-neutral-600">{user.department_name ?? "—"}</Td>
                      {canEdit && (
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn-ghost btn-xs"
                              onClick={() => openEdit(user)}
                              aria-label="Modifier"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            {isAdmin && (
                              <button
                                className="btn-ghost btn-xs text-red-600 hover:bg-red-50"
                                onClick={() => deleteUser(user.id)}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        title="Inviter un membre"
        description="Un email sera envoyé avec un lien pour accepter l'invitation."
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setInviteOpen(false)}
              disabled={inviteSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="invite-form"
              className="btn-primary"
              disabled={inviteSubmitting}
            >
              {inviteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer l'invitation"}
            </button>
          </>
        }
      >
        <form id="invite-form" onSubmit={submitInvite} className="space-y-4">
          {inviteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {inviteError}
            </div>
          )}
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              required
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="collegue@exemple.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select
                className="input"
                value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value as UserRole })}
              >
                <option value="employee">Employé</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="label">Département</label>
              <select
                className="input"
                value={invite.department_id}
                onChange={(e) => setInvite({ ...invite, department_id: e.target.value })}
              >
                <option value="">Non assigné</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        title="Modifier le membre"
        description="Mettre à jour le rôle et les affectations de cette personne."
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditOpen(false)}
              disabled={editSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="edit-form"
              className="btn-primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </button>
          </>
        }
      >
        <form id="edit-form" onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              required
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              Nouveau mot de passe (laisser vide pour conserver l'actuel)
            </label>
            <input
              type="password"
              className="input"
              minLength={0}
              value={edit.password}
              onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              placeholder="Inchangé"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select
                className="input"
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as UserRole })}
                disabled={!isAdmin}
              >
                <option value="employee">Employé</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="label">Titre du poste</label>
              <input
                className="input"
                value={edit.job_title}
                onChange={(e) => setEdit({ ...edit, job_title: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Département</label>
            <select
              className="input"
              value={edit.department_id}
              onChange={(e) => setEdit({ ...edit, department_id: e.target.value })}
            >
              <option value="">Non assigné</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
