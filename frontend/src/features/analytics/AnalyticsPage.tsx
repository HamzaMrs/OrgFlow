import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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

const COLORS = ["#94a3b8", "#f59e0b", "#10b981"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsSummary>("/analytics/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <div className="card p-6 text-rose-600">{error}</div>;
  if (!data) return <div className="card p-6 text-slate-500">Loading analytics...</div>;

  const projectStatusData = data.projectStatus.map((s, i) => ({
    name: statusLabel(s.status),
    value: s.count,
    fill: COLORS[i % COLORS.length],
  }));

  const completionLine = data.completion.map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    rate: c.rate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">
          Project progress, workload distribution, and completion trends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Project distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {projectStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Completion rate by project</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3c6bff"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Workload by person</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.workload}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="todo" stackId="a" fill="#94a3b8" name="To do" />
              <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In progress" />
              <Bar dataKey="done" stackId="a" fill="#10b981" name="Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
