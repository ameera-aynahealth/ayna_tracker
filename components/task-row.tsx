"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  owner?: { name: string } | null;
};

const toneClasses: Record<string, string> = {
  brick: "text-brick-text",
  gold: "text-gold-text",
  accent: "text-accent-text",
  plum: "text-plum-text",
  sage: "text-sage-text",
};

export function TaskRow({ task }: { task: TaskWithProject }) {
  const [status, setStatus] = useState(task.status);
  const [isPending, startTransition] = useTransition();
  const { label, tone } = formatDueBadge(task.dueAt, status);
  const done = status === "completed";

  function toggleComplete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const previous = status;
    const next = done ? "not_started" : "completed";
    setStatus(next);
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: next });
      } catch {
        setStatus(previous);
      }
    });
  }

  return (
    <Link href={`/tasks/${task.id}`} prefetch className="group flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-page/55 transition-colors">
      <button onClick={toggleComplete} disabled={isPending} aria-label={done ? "Mark incomplete" : "Mark complete"} className="shrink-0">
        {done ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-border-strong group-hover:text-accent" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium leading-5 break-words ${done ? "line-through text-text-muted" : ""}`}>{task.title}</div>
        <div className="sm:hidden text-[11px] text-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {task.project && <span>{task.project.name}</span>}
          {task.owner && <span>{task.owner.name}</span>}
          <span>{label}</span>
        </div>
      </div>
      {task.priority === "urgent" && !done && <span className="hidden sm:inline text-[10px] font-semibold bg-brick-soft text-brick-text rounded-full px-2 py-1">Urgent</span>}
      {task.project && <span className="hidden md:block text-xs text-text-muted max-w-36 truncate">{task.project.name}</span>}
      {task.owner && <span className="hidden lg:block text-xs text-text-muted max-w-28 truncate">{task.owner.name}</span>}
      <span className={`hidden sm:block text-xs font-medium shrink-0 ${toneClasses[tone] ?? "text-text-muted"}`}>{label}</span>
    </Link>
  );
}
