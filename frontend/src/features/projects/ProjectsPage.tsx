import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusBadge, { statusDotClass } from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import { useAuth } from "../auth/AuthContext";
import type { Project, ProjectStatus, User } from "../../types/models";

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  owner_id: string;
  start_date: string;
  due_date: string;
  member_ids: string[];
}

const emptyForm: ProjectFormState = {
  name: "",
  description: "",
  status: "todo",
  owner_id: "",
  start_date: "",
  due_date: "",
  member_ids: [],
};

export default function ProjectsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin", "manager");
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [projectsRes, usersRes] = await Promise.all([
      api.get<Project[]>("/projects"),
      api.get<User[]>("/users"),
    ]);
    setProjects(projectsRes.data);
    setUsers(usersRes.data);
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

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      owner_id: project.owner_id ?? "",
      start_date: project.start_date ?? "",
      due_date: project.due_date ?? "",
      member_ids: project.members.map((m) => m.id),
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        status: form.status,
        owner_id: form.owner_id || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        member_ids: form.member_ids,
      };
      if (editingId) await api.patch(`/projects/${editingId}`, payload);
      else await api.post("/projects", payload);
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce projet ? Cette action est irréversible.")) return;
    try {
      await api.delete(`/projects/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function quickStatusChange(project: Project, status: ProjectStatus) {
    try {
      await api.patch(`/projects/${project.id}`, { status });
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  const columns = useMemo(
    () => [
      { status: "todo" as const, label: "À faire" },
      { status: "in_progress" as const, label: "En cours" },
      { status: "done" as const, label: "Terminé" },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Projets"
        description="Planifiez, assignez et suivez le travail au sein de l'organisation."
        actions={
          canEdit ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau projet
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
        <div className="flex items-center justify-center py-24 text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {columns.map((col) => {
            const items = projects.filter((p) => p.status === col.status);
            return (
              <div key={col.status} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`dot ${statusDotClass(col.status)}`} />
                    <h3 className="text-xs font-semibold tracking-tight text-neutral-700">
                      {col.label}
                    </h3>
                    <span className="text-xs tabular-nums text-neutral-400">
                      {items.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-[0.6875rem] text-neutral-400">
                      Aucun projet
                    </p>
                  )}
                  {items.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      canEdit={canEdit}
                      onStatusChange={(status) => quickStatusChange(project, status)}
                      onEdit={() => openEdit(project)}
                      onDelete={() => onDelete(project.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Modifier le projet" : "Nouveau projet"}
        description={
          editingId
            ? "Mettre à jour les détails et les membres du projet."
            : "Créer un projet et assigner des membres."
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
              form="project-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                "Enregistrer"
              ) : (
                "Créer le projet"
              )}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              placeholder="Projet sans titre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[72px]"
              placeholder="Optionnel — contexte, objectifs, liens"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Statut</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
              </select>
            </div>
            <div>
              <label className="label">Propriétaire</label>
              <select
                className="input"
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
              >
                <option value="">Non assigné</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de début</label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date d'échéance</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Membres de l'équipe</label>
            <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-neutral-200 p-1.5">
              {users.map((u) => {
                const checked = form.member_ids.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          member_ids: e.target.checked
                            ? [...prev.member_ids, u.id]
                            : prev.member_ids.filter((id) => id !== u.id),
                        }));
                      }}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="font-medium text-neutral-700">{u.name}</span>
                    <span className="ml-auto capitalize text-neutral-400">
                      {u.role}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ProjectCard({
  project,
  canEdit,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  project: Project;
  canEdit: boolean;
  onStatusChange: (status: ProjectStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress =
    project.task_count > 0
      ? Math.round((project.tasks_done / project.task_count) * 100)
      : 0;

  return (
    <div className="group surface-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-neutral-900">
            {project.name}
          </div>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
              {project.description}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="relative">
            <button
              className="btn-ghost btn-xs -mr-1.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Plus d'actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-7 z-20 w-40 animate-slide-up overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-pop">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-50"
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50"
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {project.task_count > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[0.6875rem] text-neutral-400">
            <span>
              {project.tasks_done}/{project.task_count} tâches
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {project.members.length > 0 && (
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  title={m.name}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[0.5625rem] font-semibold text-neutral-600"
                >
                  {m.name.slice(0, 1)}
                </div>
              ))}
              {project.members.length > 4 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[0.5625rem] font-semibold text-neutral-500">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          )}
          {project.due_date && (
            <span className="flex items-center gap-1 text-[0.6875rem] text-neutral-400">
              <Calendar className="h-3 w-3" />
              {project.due_date}
            </span>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      {canEdit && (
        <div className="mt-3 -mx-1 border-t border-neutral-100 pt-3">
          <select
            className="input btn-xs h-6 w-full cursor-pointer text-[0.6875rem]"
            value={project.status}
            onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
          >
            <option value="todo">Déplacer vers À faire</option>
            <option value="in_progress">Déplacer vers En cours</option>
            <option value="done">Déplacer vers Terminé</option>
          </select>
        </div>
      )}
    </div>
  );
}
