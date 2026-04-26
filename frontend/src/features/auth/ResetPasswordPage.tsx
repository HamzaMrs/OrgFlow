import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, apiError, setStoredToken } from "../../api/client";
import { LogoIcon } from "../../components/Logo";
import { validatePassword } from "../../utils/password";
import { useAuth } from "./AuthContext";
import type { AuthUser } from "../../types/models";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordHint = password.length > 0 ? validatePassword(password) : null;
  const mismatch = confirm.length > 0 && password !== confirm;

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
        "/auth/reset-password",
        { token, password },
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
            Nouveau mot de passe
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Choisissez un nouveau mot de passe pour votre compte
          </p>
        </div>

        <form onSubmit={onSubmit} className="surface animate-slide-up space-y-4 p-6 shadow-subtle">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
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
            {mismatch && (
              <p className="mt-1 text-[0.6875rem] text-amber-600">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Définir le mot de passe"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/login" className="font-medium text-neutral-900 underline-offset-2 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
