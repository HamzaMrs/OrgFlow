import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { apiError } from "../../api/client";
import { LogoIcon, LogoText } from "../../components/Logo";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function quickFill(role: "admin" | "manager" | "employee") {
    setEmail(`${role}@orgflow.local`);
    setPassword("password");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <LogoIcon className="mx-auto mb-5 h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Welcome to <LogoText />
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to continue to your workspace
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
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-[0.6875rem] uppercase tracking-wider text-neutral-400">
            Demo accounts
          </p>
          <div className="flex justify-center gap-1.5">
            {(["admin", "manager", "employee"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => quickFill(role)}
                className="btn-secondary btn-xs capitalize"
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-[0.6875rem] text-neutral-400">
            Password: <span className="kbd">password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
