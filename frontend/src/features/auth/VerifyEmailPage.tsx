import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api, apiError } from "../../api/client";
import { LogoIcon } from "../../components/Logo";
import { useAuth } from "./AuthContext";

type Status = "pending" | "ok" | "error";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Lien invalide");
      return;
    }
    let cancelled = false;
    api
      .post(`/auth/verify-email/${token}`)
      .then(async () => {
        if (cancelled) return;
        setStatus("ok");
        // If the user is already logged in, refresh /me so the banner clears.
        await refresh();
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiError(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-sm text-center">
        <LogoIcon className="mx-auto mb-6 h-12 w-12" />

        {status === "pending" && (
          <div className="surface space-y-3 p-6 shadow-subtle">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-600">Confirmation en cours…</p>
          </div>
        )}

        {status === "ok" && (
          <div className="surface space-y-3 p-6 shadow-subtle">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-neutral-900">
              Adresse confirmée !
            </p>
            <p className="text-xs text-neutral-500">
              Vous pouvez accéder à toutes les fonctionnalités.
            </p>
            <Link to="/" className="btn-primary w-full justify-center">
              Aller au tableau de bord
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="surface space-y-3 p-6 shadow-subtle">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm font-medium text-neutral-900">
              Confirmation impossible
            </p>
            <p className="text-xs text-neutral-500">{error ?? "Lien invalide ou expiré."}</p>
            <Link to="/login" className="btn-secondary w-full justify-center">
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
