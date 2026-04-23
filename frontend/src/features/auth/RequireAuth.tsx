import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
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
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="card max-w-md p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Access restricted</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your role ({user.role}) does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
