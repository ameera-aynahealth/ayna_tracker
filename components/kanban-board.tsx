"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, GripVertical, Search, X } from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { ExplorerTask } from "@/components/task-explorer";

const columns = [
  ["backlog", "Backlog"],
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["waiting", "Waiting"],
  ["blocked", "Blocked"],
  ["needs_review", "Needs Review"],
  ["completed", "Completed"],
] as const;

type GroupMode = "none" | "project" | "owner" | "priority";
type OpenStatus = "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed";

export function KanbanBoard({
  initialTasks,
  defaultGroup = "none",
  projectId,
}: {
  initialTasks: ExplorerTask[];
  defaultGroup?: GroupMode;
  projectId?: string;
}) {
  const [tasks, setTasks] = useState(initialTasks.filter((task) => task.status !== "cancelled"));
  const [query, setQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>(defaultGroup);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selected, setSelected] = useState<ExplorerTask | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return tasks.filter((task) => !lower || `${task.title} ${task.owner?.name ?? ""} ${task.project?.name ?? ""}`.toLowerCase().includes(lower));
  }, [tasks, query]);

  const lanes = useMemo(() => {
    if (groupMode === "none") return [{ key: "all", label: "All tasks", tasks: visible }];
    const map = new Map<string, { label: string; tasks: ExplorerTask[] }>();
    for (const task of visible) {
      let key = "unassigned";
      let label = "Unassigned";
      if (groupMode === "project") {
        key = task.project?.id ?? "no-project";
        label = task.project?.name ?? "No project";
      } else if (groupMode === "owner") {
        key = task.owner?.id ?? "unassigned";
        label = task.owner?.name ?? "Unassigned";
      } else if (groupMode === "priority") {
        key = task.priority;
        label = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
      }
      const current = map.get(key) ?? { label, tasks: [] };
      current.tasks.push(task);
      map.set(key, current);
    }
    const order = groupMode === "priority" ? ["urgent", "high", "medium", "low"] : [];
    return [...map.entries()]
      .sort(([a, aValue], [b, bValue]) => order.length ? order.indexOf(a) - order.indexOf(b) : aValue.label.localeCompare(bValue.label))
      .map(([key, value]) => ({ key, label: value.label, tasks: value.tasks }));
  }, [visible, groupMode]);

  const activeColumns = showCompleted ? columns : columns.filter(([status]) => status !== "completed");

  function moveTask(taskId: string, nextStatus: OpenStatus) {
    const task = tasks.find((row) => row.id === taskId);
    if (!task || task.status === nextStatus) return;
    const previousStatus = task.status;
    setTasks((rows) => rows.map((row) => row.id === taskId ? { ...row, status: nextStatus } : row));
    setSelected((current) => current?.id === taskId ? { ...current, status: nextStatus } : current);
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId, status: nextStatus });
      } catch {
        setTasks((rows) => rows.map((row) => row.id === taskId ? { ...row, status: previousStatus } : row));
        setSelected((current) => current?.id === taskId ? { ...current, status: previousStatus } : current);
      }
    });
  }

  return (
    <div>
      <div className="border border-border bg-surface p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3" style={{ borderRadius: "18px 9px 9px 9px" }}>
        <label className="flex items-center gap-2 border border-border bg-page rounded-xl px-3 py-2.5 flex-1 max-w-xl">
          <Search size={15} className="text-text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter this board" className="bg-transparent outline-none flex-1 min-w-0 text-sm" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear board search"><X size={14} className="text-text-muted" /></button>}
        </label>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <label className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 text-xs text-text-secondary bg-surface">
            <span>Group by</span>
            <select value={groupMode} onChange={(event) => setGroupMode(event.target.value as GroupMode)} className="bg-transparent outline-none font-semibold appearance-none">
              <option value="none">None</option>
              {!projectId && <option value="project">Project</option>}
              <option value="owner">Assignee</option>
              <option value="priority">Priority</option>
            </select>
            <ChevronDown size={12} />
          </label>
          <button onClick={() => setShowCompleted((value) => !value)} className="border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary bg-surface">
            {showCompleted ? "Hide completed" : "Show completed"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {lanes.map((lane) => (
          <section key={lane.key}>
            {groupMode !== "none" && (
              <div className="flex items-center gap-2 mb-2.5">
                <h2 className="font-voice text-lg font-semibold">{lane.label}</h2>
                <span className="text-xs text-text-muted">{lane.tasks.length} tasks</span>
              </div>
            )}
            <div className="overflow-x-auto pb-3 -mx-1 px-1">
              <div className="flex gap-3 min-w-max items-start">
                {activeColumns.map(([status, label]) => {
                  const columnTasks = lane.tasks.filter((task) => task.status === status);
                  return (
                    <div
                      key={status}
                      className={`w-[276px] rounded-2xl border ${dragging ? "border-border-strong" : "border-border"} bg-page/60 overflow-hidden transition-colors`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const taskId = event.dataTransfer.getData("text/task-id") || dragging;
                        if (taskId) moveTask(taskId, status);
                        setDragging(null);
                      }}
                    >
                      <div className="px-3.5 py-3 flex items-center justify-between border-b border-border/70 sticky top-0 bg-page/95 backdrop-blur z-10">
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[11px] text-text-muted bg-surface rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center">{columnTasks.length}</span>
                      </div>
                      <div className="p-2.5 space-y-2 min-h-24 max-h-[62vh] overflow-y-auto">
                        {columnTasks.map((task) => (
                          <button
                            key={task.id}
                            draggable
                            onDragStart={(event) => {
                              setDragging(task.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/task-id", task.id);
                            }}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => setSelected(task)}
                            className={`w-full text-left bg-surface border border-border rounded-xl p-3 hover:border-border-strong hover:shadow-sm transition-all ${dragging === task.id ? "opacity-45" : ""}`}
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical size={14} className="text-text-muted mt-0.5 shrink-0 opacity-0 group-hover:opacity-100" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium leading-5 break-words">{task.title}</div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${priorityTone(task.priority)}`}>{task.priority}</span>
                                  {task.dueAt && <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 bg-page ${isOverdue(task) ? "text-brick-text" : "text-text-muted"}`}>{formatDue(task.dueAt)}</span>}
                                </div>
                                <div className="text-[11px] text-text-muted mt-2 flex items-center justify-between gap-2">
                                  <span className="truncate">{task.owner?.name ?? "Unassigned"}</span>
                                  {!projectId && <span className="truncate text-right">{task.project?.name ?? "No project"}</span>}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                        {columnTasks.length === 0 && <div className="py-7 text-center text-xs text-text-muted">No tasks here</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {visible.length === 0 && <div className="border border-border bg-surface rounded-2xl p-10 text-center text-sm text-text-muted">No tasks match this board filter.</div>}
      {isPending && <div className="fixed bottom-5 right-5 z-40 bg-text-primary text-white text-xs rounded-full px-3 py-2 shadow-lg">Saving board change</div>}
      {selected && <BoardPreview task={selected} onClose={() => setSelected(null)} onStatus={(status) => moveTask(selected.id, status as OpenStatus)} />}
    </div>
  );
}

function BoardPreview({ task, onClose, onStatus }: { task: ExplorerTask; onClose: () => void; onStatus: (status: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-text-primary/20 backdrop-blur-[1px]" onClick={onClose} aria-label="Close task preview" />
      <aside className="relative h-full w-full max-w-lg bg-surface border-l border-border shadow-2xl p-6 overflow-y-auto animate-slide-in">
        <div className="flex justify-between items-start gap-4 mb-5">
          <div className="text-xs text-text-muted">{task.project?.name ?? "No project"}</div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-sunk" aria-label="Close"><X size={17} /></button>
        </div>
        <h2 className="font-voice text-2xl font-semibold leading-tight mb-6">{task.title}</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Info label="Assignee" value={task.owner?.name ?? "Unassigned"} />
          <Info label="Priority" value={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} />
          <Info label="Due" value={task.dueAt ? formatDueLong(task.dueAt) : "No due date"} />
          <Info label="Project" value={task.project?.name ?? "No project"} />
        </div>
        <label className="block text-[11px] uppercase tracking-[0.1em] font-semibold text-text-muted mb-2">Status</label>
        <select value={task.status} onChange={(event) => onStatus(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm mb-6">
          {columns.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Link href={`/tasks/${task.id}`} className="flex items-center justify-center bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold">Open full task details</Link>
        <p className="text-xs text-text-muted text-center mt-3">This preview uses board data already in memory, so it opens without a loading screen.</p>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-page p-3.5"><div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-1">{label}</div><div className="text-sm font-medium break-words">{value}</div></div>;
}

function priorityTone(priority: string) {
  if (priority === "urgent") return "bg-brick-soft text-brick-text";
  if (priority === "high") return "bg-gold-soft text-gold-text";
  if (priority === "low") return "bg-sage-soft text-sage-text";
  return "bg-accent-soft text-accent-text";
}

function isOverdue(task: ExplorerTask) {
  return Boolean(task.dueAt && new Date(task.dueAt) < new Date() && !["completed", "cancelled"].includes(task.status));
}

function formatDue(date: string) {
  const value = new Date(date);
  const today = new Date();
  const diff = Math.round((new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d late`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDueLong(date: string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
