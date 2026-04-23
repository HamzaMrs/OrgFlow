import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, apiError } from "../../api/client";
import type { AnalyticsSummary } from "../../types/models";
import { statusLabel } from "../../components/StatusBadge";

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#f59e0b",
  done: "#10b981",
};

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsSummary>("/analytics/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <div className="card p-6 text-rose-600">{error}</div>;
  if (!data) return <div className="card p-6 text-slate-500">Loading dashboard...</div>;

  const projectStatusData = data.projectStatus.map((s) => ({
    name: statusLabel(s.status),
    value: s.count,
    key: s.status,
  }));

  const taskStatusData = data.taskStatus.map((s) => ({
    name: statusLabel(s.status),
    value: s.count,
    key: s.status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live snapshot of your organization.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={data.counters.total_projects} tint="brand" />
        <StatCard label="Tasks" value={data.counters.total_tasks} tint="amber" />
        <StatCard label="People" value={data.counters.total_users} tint="emerald" />
        <StatCard label="Departments" value={data.counters.total_departments} tint="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Project status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {projectStatusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Task status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {taskStatusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Team workload</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  width={100}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="todo" stackId="a" fill="#94a3b8" name="To do" />
                <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In progress" />
                <Bar dataKey="done" stackId="a" fill="#10b981" name="Done" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Task completion rate</h3>
          <div className="space-y-3">
            {data.completion.length === 0 && (
              <p className="text-sm text-slate-500">No projects yet.</p>
            )}
            {data.completion.map((project) => (
              <div key={project.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{project.name}</span>
                  <span className="text-slate-500">
                    {project.done}/{project.total} ({project.rate}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${project.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const tintClasses: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
};

function StatCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        <span className={`badge ${tintClasses[tint] ?? tintClasses.slate}`}>total</span>
      </div>
    </div>
  );
}
