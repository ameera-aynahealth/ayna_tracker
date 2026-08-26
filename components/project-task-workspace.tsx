"use client";

import { useState } from "react";
import { Columns3, List } from "lucide-react";
import { TaskExplorer, type ExplorerTask } from "@/components/task-explorer";
import { KanbanBoard } from "@/components/kanban-board";

export function ProjectTaskWorkspace({
  tasks,
  people,
  project,
}: {
  tasks: ExplorerTask[];
  people: Array<{ id: string; name: string }>;
  project: { id: string; name: string };
}) {
  const [view, setView] = useState<"list" | "board">("list");

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-voice text-xl font-semibold">Project tasks</h2>
          <p className="text-xs text-text-muted mt-0.5">Switch views instantly. The project data is already loaded.</p>
        </div>
        <div className="inline-flex self-start rounded-xl border border-border bg-surface p-1">
          <button onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}><List size={14} />List</button>
          <button onClick={() => setView("board")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "board" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}><Columns3 size={14} />Board</button>
        </div>
      </div>

      {view === "list" ? (
        <TaskExplorer tasks={tasks} people={people} projects={[project]} />
      ) : (
        <KanbanBoard initialTasks={tasks} defaultGroup="owner" projectId={project.id} />
      )}
    </section>
  );
}
