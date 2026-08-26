"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { formatDueBadge } from "@/lib/format";

type TaskWithProject = {
  id: string;
  title: string;
  dueAt: Date | null;
  status: string;
  priority: string;
  project?: { name: string } | null;
};

const toneClasses: Record<string, string> = {
  brick: "text-brick-text",
  gold: "text-gold-text",
  accent: "text-accent-text",
  plum: "text-plum-text",
  sage: "text-sage-text",
};

export function TaskRow({ task }: { task: TaskWithProject }) {
  const [isPending, startTransition] = useTransition();
  const { label, tone } = formatDueBadge(task.dueAt, task.status);
  const done = task.status === "completed";

  function toggleComplete(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateTaskStatus({ taskId: task.id, status: done ? "not_started" : "completed" });
    });
  }

  return (
    <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunk/40">
      <button onClick={toggleComplete} disabled={isPending} aria-label={done ? "Mark incomplete" : "Mark complete"}>
        {done ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-border-strong" />}
      </button>
      <span className={`flex-1 text-sm ${done ? "line-through text-text-muted" : ""}`}>{task.title}</span>
      {task.priority === "urgent" && !done && (
        <span className="text-xs font-semibold text-brick-text">Urgent</span>
      )}
      {task.project && <span className="text-xs text-text-muted">{task.project.name}</span>}
      <span className={`text-xs font-medium ${toneClasses[tone]}`}>{label}</span>
    </Link>
  );
}
