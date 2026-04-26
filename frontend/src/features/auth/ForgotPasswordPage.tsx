import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { api, apiError } from "../../api/client";
import { LogoIcon, LogoText } from "../../components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
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
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Recevez un lien de réinitialisation par email
          </p>
        </div>

        {sent ? (
          <div className="surface space-y-3 p-6 text-center shadow-subtle">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm text-neutral-700">
              Si un compte existe pour <strong>{email}</strong>, un email avec un lien de réinitialisation vient d'être envoyé.
            </p>
            <p className="text-xs text-neutral-500">
              Vérifiez aussi vos spams. Le lien expire dans 1 heure.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="surface animate-slide-up space-y-4 p-6 shadow-subtle">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-neutral-900 underline-offset-2 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
