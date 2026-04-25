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
import { Loader2 } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { AnalyticsSummary } from "../../types/models";
import PageHeader from "../../components/PageHeader";
import { statusLabel } from "../../components/StatusBadge";

const COLORS = ["#d4d4d4", "#fbbf24", "#10b981"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsSummary>("/analytics/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error)
    return <div className="surface p-6 text-sm text-red-600">{error}</div>;
  if (!data || !data.projectStatus || !data.completion || !data.workload)
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );

  const projectStatusData = (data.projectStatus ?? []).map((s, i) => ({
    name: statusLabel(s.status),
    value: s.count,
    fill: COLORS[i % COLORS.length],
  }));

  const completionLine = (data.completion ?? []).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    rate: c.rate,
  }));

  return (
    <div>
      <PageHeader
        title="Analyses"
        description="Avancement des projets, répartition de la charge de travail, et tendances."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Répartition des projets"
          hint="Par statut"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  strokeWidth={0}
                  label={{ fontSize: 11, fill: "#737373" }}
                >
                  {projectStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
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

        <ChartCard
          title="Taux d'achèvement"
          hint="Par projet, en pourcentage"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionLine} margin={{ top: 10, right: 10, left: -20 }}>
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
                  domain={[0, 100]}
                  unit="%"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<MinimalTooltip suffix="%" />}
                  cursor={{ stroke: "#e5e5e5", strokeDasharray: "3 3" }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0a0a0a", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#0a0a0a", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="Charge de travail par personne" hint="Tâches par assigné, par statut">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workload} margin={{ top: 10, right: 10, left: -20 }}>
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
                <Legend
                  verticalAlign="top"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 12 }}
                  formatter={(v) => (
                    <span className="text-xs text-neutral-600">{v}</span>
                  )}
                />
                <Bar dataKey="todo" stackId="a" fill="#d4d4d4" name="À faire" />
                <Bar dataKey="in_progress" stackId="a" fill="#fbbf24" name="En cours" />
                <Bar dataKey="done" stackId="a" fill="#10b981" name="Terminé" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
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
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
          {title}
        </h3>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
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
  suffix = "",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  suffix?: string;
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
          <span className="tabular-nums text-neutral-900">
            {entry.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
