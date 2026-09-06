"use client";

import { useMemo, useState } from "react";
import { Columns3, List, UserRound, UsersRound } from "lucide-react";
import { type ExplorerTask } from "@/components/task-explorer";
import { ProjectTaskList } from "@/components/project-task-list";
import { KanbanBoard } from "@/components/kanban-board";

export function ProjectTaskWorkspace({
  tasks,
  myTaskIds,
  people,
  project,
}: {
  tasks: ExplorerTask[];
  myTaskIds: string[];
  people: Array<{ id: string; name: string }>;
  project: { id: string; name: string };
}) {
  const [view, setView] = useState<"list" | "board">("list");
  const [scope, setScope] = useState<"mine" | "everyone">("everyone");
  const myTaskIdSet = useMemo(() => new Set(myTaskIds), [myTaskIds]);
  const visibleTasks = scope === "mine" ? tasks.filter((task) => myTaskIdSet.has(task.id)) : tasks;

  return (
    <section>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-voice text-xl font-semibold">Project tasks</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {scope === "mine" ? `${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"} assigned to or involving you.` : `${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"} across the whole team.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setScope("mine")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "mine" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}
            >
              <UserRound size={14} />My tasks
            </button>
            <button
              onClick={() => setScope("everyone")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "everyone" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}
            >
              <UsersRound size={14} />Everyone's tasks
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}><List size={14} />List</button>
            <button onClick={() => setView("board")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "board" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}><Columns3 size={14} />Board</button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <ProjectTaskList key={`list-${scope}`} initialTasks={visibleTasks} people={people} />
      ) : (
        <KanbanBoard key={`board-${scope}`} initialTasks={visibleTasks} defaultGroup="owner" projectId={project.id} />
      )}
    </section>
  );
}
