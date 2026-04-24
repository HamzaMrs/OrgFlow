import clsx from "clsx";
import type { ProjectStatus } from "../types/models";

const styles: Record<ProjectStatus, string> = {
  todo: "border-neutral-200 bg-neutral-50 text-neutral-600",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const dotStyles: Record<ProjectStatus, string> = {
  todo: "bg-neutral-400",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
};

const labels: Record<ProjectStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={clsx("badge", styles[status])}>
      <span className={clsx("dot", dotStyles[status])} />
      {labels[status]}
    </span>
  );
}

export function statusLabel(status: ProjectStatus): string {
  return labels[status];
}

export function statusDotClass(status: ProjectStatus): string {
  return dotStyles[status];
}
