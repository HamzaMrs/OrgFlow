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
import {
  Activity,
  Building2,
  CheckCircle2,
  FolderKanban,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { AnalyticsSummary } from "../../types/models";
import PageHeader from "../../components/PageHeader";
import { statusLabel } from "../../components/StatusBadge";

const STATUS_COLORS: Record<string, string> = {
  todo: "#d4d4d4",
  in_progress: "#fbbf24",
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

  if (error)
    return (
      <div className="surface p-6 text-sm text-red-600">{error}</div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );

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

  const tasksDone = data.taskStatus.find((s) => s.status === "done")?.count ?? 0;
  const completionRate =
    data.counters.total_tasks > 0
      ? Math.round((tasksDone / data.counters.total_tasks) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A real-time snapshot of your organization."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={data.counters.total_projects}
          icon={FolderKanban}
        />
        <StatCard
          label="Tasks"
          value={data.counters.total_tasks}
          icon={Activity}
        />
        <StatCard label="People" value={data.counters.total_users} icon={Users} />
        <StatCard
          label="Completion"
          value={`${completionRate}%`}
          icon={CheckCircle2}
          trend={completionRate >= 50 ? "up" : undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Project status" hint="Distribution across your portfolio">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {projectStatusData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[entry.key] ?? "#d4d4d4"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<MinimalTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span className="text-xs text-neutral-600">{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Task status" hint="Work across all projects">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData} margin={{ top: 10, right: 10, left: -20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f3f4f6"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<MinimalTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {taskStatusData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[entry.key] ?? "#d4d4d4"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Team workload" hint="Top 10 by task assignments">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.workload}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f3f4f6"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip content={<MinimalTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="todo" stackId="a" fill="#d4d4d4" name="Todo" radius={[4, 0, 0, 4]} />
                <Bar dataKey="in_progress" stackId="a" fill="#fbbf24" name="In progress" />
                <Bar dataKey="done" stackId="a" fill="#10b981" name="Done" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Completion rate" hint="Tasks done per project">
          <div className="space-y-3.5">
            {data.completion.length === 0 && (
              <p className="py-12 text-center text-xs text-neutral-400">
                No projects yet.
              </p>
            )}
            {data.completion.map((project) => (
              <div key={project.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-neutral-700">
                    {project.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-neutral-400">
                    {project.done}/{project.total} · {project.rate}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${project.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down";
}) {
  return (
    <div className="surface-hover p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-neutral-900">
          {value}
        </span>
        {trend === "up" && (
          <span className="flex items-center gap-0.5 text-[0.6875rem] text-emerald-600">
            <TrendingUp className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
            {title}
          </h3>
          {hint && <p className="text-xs text-neutral-500">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}
function MinimalTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-pop">
      {label !== undefined && (
        <div className="mb-0.5 font-medium text-neutral-900">{label}</div>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-neutral-600">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="capitalize">{entry.name}:</span>
          <span className="tabular-nums text-neutral-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
