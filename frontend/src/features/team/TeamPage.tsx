import { FormEvent, useEffect, useState } from "react";
import { api, apiError } from "../../api/client";
import Modal from "../../components/Modal";
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
    if (!confirm("Remove this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">Manage people, roles, and assignments.</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            + Add member
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Loading team...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Title</Th>
                  <Th>Department</Th>
                  {canEdit && <Th className="text-right">Actions</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {user.name.slice(0, 1)}
                        </div>
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{user.email}</Td>
                    <Td>
                      <span className="badge bg-slate-100 capitalize text-slate-700">
                        {user.role}
                      </span>
                    </Td>
                    <Td className="text-slate-600">{user.job_title ?? "—"}</Td>
                    <Td className="text-slate-600">{user.department_name ?? "—"}</Td>
                    {canEdit && (
                      <Td className="text-right">
                        <button
                          className="btn-secondary h-8 px-3 py-1 text-xs"
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </button>
                        {canCreate && (
                          <button
                            className="btn-danger ml-2 h-8 px-3 py-1 text-xs"
                            onClick={() => onDelete(user.id)}
                          >
                            Remove
                          </button>
                        )}
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
        title={editingId ? "Edit member" : "Add team member"}
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
              form="user-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingId ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {!editingId && (
            <div>
              <label className="label">Email</label>
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
              {editingId ? "New password (leave blank to keep current)" : "Password"}
            </label>
            <input
              type="password"
              className="input"
              required={!editingId}
              minLength={editingId ? 0 : 8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Job title</label>
              <input
                className="input"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">Unassigned</option>
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
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 ${className}`}>{children}</td>;
}
