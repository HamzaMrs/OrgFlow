import { FormEvent, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api, apiError } from "../../api/client";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import type { Department, User, UserRole } from "../../types/models";

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  job_title: string;
  department_id: string;
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  job_title: "",
  department_id: "",
};

const roleStyles: Record<UserRole, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  manager: "border-blue-200 bg-blue-50 text-blue-700",
  employee: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

export default function TeamPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("admin");
  const canEdit = hasRole("admin", "manager");

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [u, d] = await Promise.all([
      api.get<User[]>("/users"),
      api.get<Department[]>("/departments"),
    ]);
    setUsers(u.data);
    setDepartments(d.data);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      job_title: user.job_title ?? "",
      department_id: user.department_id ?? "",
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          job_title: form.job_title || null,
          department_id: form.department_id || null,
        };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editingId}`, payload);
      } else {
        await api.post("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          job_title: form.job_title || null,
          department_id: form.department_id || null,
        });
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
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
          canCreate ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter un membre
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
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
                    className={
                      idx < users.length - 1 ? "border-b border-neutral-100" : ""
                    }
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
                          <div className="font-medium text-neutral-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className={`badge ${roleStyles[user.role]} capitalize`}>
                        {user.role}
                      </span>
                    </Td>
                    <Td className="text-neutral-600">{user.job_title ?? "—"}</Td>
                    <Td className="text-neutral-600">
                      {user.department_name ?? "—"}
                    </Td>
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
                          {canCreate && (
                            <button
                              className="btn-ghost btn-xs text-red-600 hover:bg-red-50"
                              onClick={() => onDelete(user.id)}
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
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? "Modifier le membre" : "Ajouter un membre"}
        description={
          editingId
            ? "Mettre à jour le rôle et les affectations de cette personne."
            : "Créer un nouveau compte avec rôle et département."
        }
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="user-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                "Enregistrer"
              ) : (
                "Créer le membre"
              )}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {!editingId && (
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="label">
              {editingId ? "Nouveau mot de passe (laisser vide pour conserver l'actuel)" : "Mot de passe"}
            </label>
            <input
              type="password"
              className="input"
              required={!editingId}
              minLength={editingId ? 0 : 8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingId ? "Inchangé" : "Au moins 8 caractères"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
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
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Département</label>
            <select
              className="input"
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
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

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-wider text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
