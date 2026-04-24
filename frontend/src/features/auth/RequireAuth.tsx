import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../../types/models";

interface Props {
  children: ReactNode;
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="surface max-w-sm p-6 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
            <Lock className="h-4 w-4 text-neutral-500" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
            Access restricted
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Your role ({user.role}) doesn't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
