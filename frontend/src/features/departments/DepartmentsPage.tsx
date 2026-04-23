import { FormEvent, useEffect, useState } from "react";
import { api, apiError } from "../../api/client";
import Modal from "../../components/Modal";
import { useAuth } from "../auth/AuthContext";
import type { Department } from "../../types/models";

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin", "manager");
  const canDelete = hasRole("admin");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const { data } = await api.get<Department[]>("/departments");
    setDepartments(data);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setModalOpen(true);
  }

  function openEdit(dept: Department) {
    setEditingId(dept.id);
    setName(dept.name);
    setDescription(dept.description ?? "");
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, description: description || null };
      if (editingId) {
        await api.patch(`/departments/${editingId}`, payload);
      } else {
        await api.post("/departments", payload);
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
    if (!confirm("Delete this department?")) return;
    try {
      await api.delete(`/departments/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">Organize your team structure.</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            + New department
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{dept.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {dept.description ?? "No description"}
                  </p>
                </div>
                <span className="badge bg-brand-50 text-brand-700">
                  {dept.member_count} {dept.member_count === 1 ? "member" : "members"}
                </span>
              </div>
              {canEdit && (
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn-secondary h-8 px-3 py-1 text-xs"
                    onClick={() => openEdit(dept)}
                  >
                    Edit
                  </button>
                  {canDelete && (
                    <button
                      className="btn-danger h-8 px-3 py-1 text-xs"
                      onClick={() => onDelete(dept.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit department" : "New department"}
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
              form="dept-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingId ? "Save" : "Create"}
            </button>
          </>
        }
      >
        <form id="dept-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
