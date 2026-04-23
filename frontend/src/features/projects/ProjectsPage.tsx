import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, apiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
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
      if (editingId) {
        await api.patch(`/projects/${editingId}`, payload);
      } else {
        await api.post("/projects", payload);
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
    if (!confirm("Delete this project? This cannot be undone.")) return;
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
      { status: "todo" as const, label: "To do" },
      { status: "in_progress" as const, label: "In progress" },
      { status: "done" as const, label: "Done" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">
            Plan, assign, and track work across the organization.
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            + New project
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-slate-500">Loading projects...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {columns.map((col) => {
            const items = projects.filter((p) => p.status === col.status);
            return (
              <div key={col.status} className="rounded-xl bg-slate-100/60 p-3">
                <div className="mb-3 flex items-center justify-between px-2">
                  <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                  <span className="text-xs text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                      No projects
                    </p>
                  )}
                  {items.map((project) => (
                    <div key={project.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {project.name}
                          </div>
                          {project.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={project.status} />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {project.tasks_done}/{project.task_count} tasks
                        </span>
                        {project.due_date && <span>Due {project.due_date}</span>}
                      </div>

                      {project.members.length > 0 && (
                        <div className="mt-3 flex -space-x-2">
                          {project.members.slice(0, 5).map((m) => (
                            <div
                              key={m.id}
                              title={m.name}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-2 ring-white"
                            >
                              {m.name.slice(0, 1)}
                            </div>
                          ))}
                          {project.members.length > 5 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 ring-2 ring-white">
                              +{project.members.length - 5}
                            </div>
                          )}
                        </div>
                      )}

                      {canEdit && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <select
                            className="input h-8 py-1 text-xs"
                            value={project.status}
                            onChange={(e) =>
                              quickStatusChange(project, e.target.value as ProjectStatus)
                            }
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            className="btn-secondary h-8 px-3 py-1 text-xs"
                            onClick={() => openEdit(project)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-danger h-8 px-3 py-1 text-xs"
                            onClick={() => onDelete(project.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit project" : "New project"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="project-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingId ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Owner</label>
              <select
                className="input"
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
              >
                <option value="">Unassigned</option>
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
              <label className="label">Start date</label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Due date</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Team members</label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={form.member_ids.includes(u.id)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        member_ids: e.target.checked
                          ? [...prev.member_ids, u.id]
                          : prev.member_ids.filter((id) => id !== u.id),
                      }));
                    }}
                  />
                  <span className="text-slate-700">{u.name}</span>
                  <span className="ml-auto text-xs capitalize text-slate-400">{u.role}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
