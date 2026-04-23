import clsx from "clsx";
import type { ProjectStatus } from "../types/models";

const styles: Record<ProjectStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

const labels: Record<ProjectStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={clsx("badge", styles[status])}>{labels[status]}</span>;
}

export function statusLabel(status: ProjectStatus): string {
  return labels[status];
}
