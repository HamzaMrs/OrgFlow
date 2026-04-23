import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useState } from "react";
import { useAuth } from "../features/auth/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true, icon: DashboardIcon },
  { to: "/projects", label: "Projects", icon: ProjectsIcon },
  { to: "/team", label: "Team", icon: TeamIcon },
  { to: "/departments", label: "Departments", icon: DeptIcon },
  { to: "/analytics", label: "Analytics", icon: AnalyticsIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h10M4 17h7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">OrgFlow</div>
            <div className="text-xs text-slate-500">Business OS</div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4 space-y-2">
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="text-xs capitalize text-slate-500">{user?.role}</div>
          </div>
          <button onClick={logout} className="btn-secondary w-full">
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="text-sm text-slate-500">
            Welcome back, <span className="font-medium text-slate-900">{user?.name}</span>
          </div>
          <div className="badge bg-brand-50 text-brand-700 capitalize">{user?.role}</div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z"
        fill="currentColor"
      />
    </svg>
  );
}
function ProjectsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        fill="currentColor"
      />
    </svg>
  );
}
function TeamIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M8 11a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6zm-8 2c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5zm8 0c-.7 0-1.3.1-2 .3 1.3 1.2 2 2.9 2 4.7v2h7v-2c0-3-3-5-7-5z"
        fill="currentColor"
      />
    </svg>
  );
}
function DeptIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21V7l9-4 9 4v14h-6v-6h-6v6H3z"
        fill="currentColor"
      />
    </svg>
  );
}
function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h16M6 16V8m6 8V4m6 12v-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
