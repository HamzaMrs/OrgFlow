import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api, apiError } from "../../api/client";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
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
      if (editingId) await api.patch(`/departments/${editingId}`, payload);
      else await api.post("/departments", payload);
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce département ?")) return;
    try {
      await api.delete(`/departments/${id}`);
      await refresh();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Départements"
        description="Organisez la structure de votre équipe et les lignes hiérarchiques."
        actions={
          canEdit ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau département
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
      ) : departments.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-6 w-6 text-neutral-300" />
          <h3 className="mt-3 text-sm font-medium text-neutral-900">
            Aucun département
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Créez-en un pour regrouper votre équipe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className="surface-hover group p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                  <Building2 className="h-4 w-4 text-neutral-600" />
                </div>
                <span className="badge-neutral">
                  <Users className="h-2.5 w-2.5" />
                  {dept.member_count}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold tracking-tight text-neutral-900">
                {dept.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                {dept.description ?? "Aucune description"}
              </p>
              {canEdit && (
                <div className="mt-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="btn-secondary btn-xs"
                    onClick={() => openEdit(dept)}
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </button>
                  {canDelete && (
                    <button
                      className="btn-ghost btn-xs text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(dept.id)}
                    >
                      <Trash2 className="h-3 w-3" />
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
        title={editingId ? "Modifier le département" : "Nouveau département"}
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
              form="dept-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                "Enregistrer"
              ) : (
                "Créer"
              )}
            </button>
          </>
        }
      >
        <form id="dept-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              placeholder="Ingénierie, Design, Opérations..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[72px]"
              placeholder="Optionnel — mission, portée, hiérarchie"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
