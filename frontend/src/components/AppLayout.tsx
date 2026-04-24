import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  Building2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { LogoIcon, LogoText } from "./Logo";

const navItems = [
  { to: "/", label: "Tableau de bord", end: true, icon: LayoutDashboard },
  { to: "/projects", label: "Projets", icon: FolderKanban },
  { to: "/team", label: "Équipe", icon: Users },
  { to: "/departments", label: "Départements", icon: Building2 },
  { to: "/analytics", label: "Analyses", icon: BarChart3 },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const initials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
            <button
              className="btn-ghost btn-sm -ml-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex flex-1 items-center gap-2 lg:gap-4">
              <div className="hidden items-center gap-2 text-sm text-neutral-400 lg:flex">
                <LogoText className="text-sm" />
                <span className="text-neutral-300">/</span>
                <CurrentBreadcrumb />
              </div>

            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2.5 rounded-full border border-neutral-200 py-1 pl-1 pr-3 sm:flex">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[0.625rem] font-semibold text-white">
                  {initials || "·"}
                </div>
                <span className="text-xs font-medium text-neutral-700">{user?.name}</span>
                <span className="text-[0.6875rem] capitalize text-neutral-400">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="btn-ghost btn-sm"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-8 lg:py-10">
          <Outlet />
        </main>

        <footer className="border-t border-neutral-200 px-4 py-4 text-xs text-neutral-400 lg:px-8">
          © 2026 OrgFlow · Conçu pour la clarté
        </footer>
      </div>
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const initials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-neutral-950/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-7 w-7" />
            <LogoText className="text-sm" />
          </div>
          <button
            className="btn-ghost btn-sm lg:hidden"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <div className="px-2 pb-2 text-[0.6875rem] font-medium uppercase tracking-wider text-neutral-400">
            Espace de travail
          </div>
          {navItems.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx("nav-link", isActive && "nav-link-active")
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {initials || "·"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-neutral-900">
                {user?.name}
              </div>
              <div className="truncate text-[0.6875rem] capitalize text-neutral-500">
                {user?.role}
              </div>
            </div>
            <button
              onClick={logout}
              className="btn-ghost btn-sm shrink-0"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function CurrentBreadcrumb() {
  const { pathname } = useLocation();
  const segment = pathname.split("/")[1] || "dashboard";
  const labels: Record<string, string> = {
    dashboard: "Tableau de bord",
    projects: "Projets",
    team: "Équipe",
    departments: "Départements",
    analytics: "Analyses",
  };
  return (
    <span className="font-medium text-neutral-700">
      {labels[segment] || segment}
    </span>
  );
}
