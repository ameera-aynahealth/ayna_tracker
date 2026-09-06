"use client";

import { useMemo, useState } from "react";
import { UserRound, UsersRound } from "lucide-react";
import { KanbanBoard } from "@/components/kanban-board";
import { type ExplorerTask } from "@/components/task-explorer";

export function ScopedKanbanBoard({ tasks, myTaskIds }: { tasks: ExplorerTask[]; myTaskIds: string[] }) {
  const [scope, setScope] = useState<"mine" | "everyone">("everyone");
  const mine = useMemo(() => new Set(myTaskIds), [myTaskIds]);
  const visibleTasks = scope === "mine" ? tasks.filter((task) => mine.has(task.id)) : tasks;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button onClick={() => setScope("mine")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "mine" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}>
            <UserRound size={14} />My tasks
          </button>
          <button onClick={() => setScope("everyone")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "everyone" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}>
            <UsersRound size={14} />Everyone's tasks
          </button>
        </div>
      </div>
      <KanbanBoard key={scope} initialTasks={visibleTasks} defaultGroup="project" />
    </div>
  );
}
