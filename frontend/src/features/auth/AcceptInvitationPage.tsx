import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, apiError, setStoredToken } from "../../api/client";
import { LogoIcon, LogoText } from "../../components/Logo";
import { validatePassword } from "../../utils/password";
import { useAuth } from "./AuthContext";
import type { AuthUser, InvitationDetails } from "../../types/models";

const ROLE_LABEL: Record<InvitationDetails["role"], string> = {
  admin: "Administrateur",
  manager: "Manager",
  employee: "Employé",
};

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Lien d'invitation invalide");
      setLoadingInvitation(false);
      return;
    }
    let cancelled = false;
    api
      .get<InvitationDetails>(`/invitations/by-token/${token}`)
      .then((res) => {
        if (cancelled) return;
        setInvitation(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(apiError(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingInvitation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const passwordHint = password.length > 0 ? validatePassword(password) : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) return;
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ user: AuthUser; token: string }>(
        `/invitations/by-token/${token}/accept`,
        { name, password },
      );
      setStoredToken(res.data.token);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <LogoIcon className="mx-auto mb-5 h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Rejoindre <LogoText />
          </h1>
        </div>

        {loadingInvitation && (
          <div className="surface space-y-3 p-6 text-center shadow-subtle">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-500">Chargement de l'invitation…</p>
          </div>
        )}

        {!loadingInvitation && loadError && (
          <div className="surface space-y-3 p-6 text-center shadow-subtle">
            <p className="text-sm font-medium text-neutral-900">Invitation indisponible</p>
            <p className="text-xs text-neutral-500">{loadError}</p>
            <Link to="/login" className="btn-secondary w-full justify-center">
              Retour à la connexion
            </Link>
          </div>
        )}

        {!loadingInvitation && invitation && (
          <form onSubmit={onSubmit} className="surface animate-slide-up space-y-4 p-6 shadow-subtle">
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              <div>
                <span className="text-neutral-500">Email :</span> <strong>{invitation.email}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Rôle :</span> {ROLE_LABEL[invitation.role]}
              </div>
              {invitation.department_name && (
                <div>
                  <span className="text-neutral-500">Département :</span> {invitation.department_name}
                </div>
              )}
              {invitation.inviter_name && (
                <div>
                  <span className="text-neutral-500">Invité par :</span> {invitation.inviter_name}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="name">Votre nom</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marie Dupont"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-[0.6875rem] text-neutral-400">
                {passwordHint
                  ? <span className="text-amber-600">{passwordHint}</span>
                  : "8 caractères, une majuscule, une minuscule, un chiffre"}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirmation</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rejoindre l'équipe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
