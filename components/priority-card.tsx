import Link from "next/link";
import { formatDueBadge } from "@/lib/format";

const toneClasses: Record<string, string> = {
  brick: "bg-brick-soft text-brick-text",
  gold: "bg-gold-soft text-gold-text",
  accent: "bg-accent-soft text-accent-text",
  plum: "bg-plum-soft text-plum-text",
  sage: "bg-sage-soft text-sage-text",
};

type TaskWithProject = {
  id: string;
  title: string;
  dueAt: Date | null;
  status: string;
  project: { name: string } | null;
};

export function PriorityCard({ task }: { task: TaskWithProject }) {
  const { label, tone } = formatDueBadge(task.dueAt, task.status);
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="border border-border bg-surface p-3.5 hover:border-border-strong transition-colors block"
      style={{ borderRadius: "20px 10px 10px 10px" }}
    >
      <div className="text-sm font-medium mb-1.5 leading-snug">{task.title}</div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${toneClasses[tone]}`}>{label}</span>
        {task.project && <span className="text-xs text-text-muted">{task.project.name}</span>}
      </div>
    </Link>
  );
}
