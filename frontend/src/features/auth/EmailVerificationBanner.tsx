import { useState } from "react";
import { Mail } from "lucide-react";
import { api, apiError } from "../../api/client";
import { useAuth } from "./AuthContext";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.email_verified) return null;

  async function resend() {
    if (!user) return;
    setSending(true);
    setError(null);
    try {
      await api.post("/auth/resend-verification", { email: user.email });
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs text-amber-900">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">
          Confirmez votre adresse <strong>{user.email}</strong> — vérifiez votre boîte de réception.
        </span>
        {sent ? (
          <span className="text-amber-700">Email renvoyé</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Renvoyer l'email"}
          </button>
        )}
        {error && <span className="text-red-700">{error}</span>}
      </div>
    </div>
  );
}
