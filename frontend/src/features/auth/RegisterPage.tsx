import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { apiError } from "../../api/client";
import { LogoIcon, LogoText } from "../../components/Logo";
import { validatePassword } from "../../utils/password";

export default function RegisterPage() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const passwordHint = password.length > 0 ? validatePassword(password) : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
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
            Créer un compte sur <LogoText />
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Quelques secondes et vous y êtes
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="surface animate-slide-up space-y-4 p-6 shadow-subtle"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="label" htmlFor="name">Nom complet</label>
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
              placeholder="••••••••"
            />
            <p className="mt-1 text-[0.6875rem] text-neutral-400">
              {passwordHint
                ? <span className="text-amber-600">{passwordHint}</span>
                : "8 caractères minimum, une majuscule, une minuscule, un chiffre"}
            </p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-medium text-neutral-900 underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
