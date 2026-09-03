"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Filter,
  ListFilter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { bulkUpdateTasks, updateTaskStatus } from "@/lib/actions/tasks";

export type ExplorerTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  updatedAt: string;
  project: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

const statusOptions = [
  ["backlog", "Backlog"],
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["waiting", "Waiting"],
  ["blocked", "Blocked"],
  ["needs_review", "Needs Review"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function TaskExplorer({
  tasks: initialTasks,
  people,
  projects,
}: {
  tasks: ExplorerTask[];
  people: Option[];
  projects: Option[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("all");
  const [project, setProject] = useState("all");
  const [sort, setSort] = useState("due");
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState<ExplorerTask | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("in_progress");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const now = new Date();
    let rows = tasks.filter((task) => {
      const matchesQuery = !query.trim() || `${task.title} ${task.project?.name ?? ""} ${task.owner?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesStatus = status === "all"
        || (status === "open" && !["completed", "cancelled"].includes(task.status))
        || (status === "overdue" && task.dueAt && new Date(task.dueAt) < now && !["completed", "cancelled"].includes(task.status))
        || task.status === status;
      const matchesOwner = owner === "all" || (owner === "unassigned" ? !task.owner : task.owner?.id === owner);
      const matchesProject = project === "all" || (project === "none" ? !task.project : task.project?.id === project);
      return matchesQuery && matchesStatus && matchesOwner && matchesProject;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "priority") return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "title") return a.title.localeCompare(b.title);
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
    return rows;
  }, [tasks, query, status, owner, project, sort]);

  function toggleChecked(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setChecked((current) => {
      const everyChecked = filtered.length > 0 && filtered.every((task) => current.has(task.id));
      if (everyChecked) return new Set([...current].filter((id) => !filtered.some((task) => task.id === id)));
      return new Set([...current, ...filtered.map((task) => task.id)]);
    });
  }

  function quickComplete(task: ExplorerTask) {
    const nextStatus = task.status === "completed" ? "not_started" : "completed";
    const previous = task.status;
    setTasks((rows) => rows.map((row) => row.id === task.id ? { ...row, status: nextStatus } : row));
    setSelected((current) => current?.id === task.id ? { ...current, status: nextStatus } : current);
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: nextStatus });
      } catch {
        setTasks((rows) => rows.map((row) => row.id === task.id ? { ...row, status: previous } : row));
        setSelected((current) => current?.id === task.id ? { ...current, status: previous } : current);
      }
    });
  }

  function applyBulkStatus() {
    const ids = [...checked];
    if (!ids.length) return;
    const previous = tasks;
    setTasks((rows) => rows.map((row) => checked.has(row.id) ? { ...row, status: bulkStatus } : row));
    setChecked(new Set());
    startTransition(async () => {
      try {
        await bulkUpdateTasks({ taskIds: ids, status: bulkStatus as "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed" | "cancelled" });
      } catch {
        setTasks(previous);
      }
    });
  }

  return (
    <div>
      <div className="border border-border bg-surface p-3 sm:p-4 mb-4" style={{ borderRadius: "18px 9px 9px 9px" }}>
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          <label className="flex items-center gap-2 bg-page border border-border rounded-xl px-3 py-2.5 xl:min-w-80 flex-1">
            <Search size={15} className="text-text-muted shrink-0" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, projects, or owners" className="bg-transparent outline-none text-sm flex-1 min-w-0" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} className="text-text-muted" /></button>}
          </label>

          <div className="grid grid-cols-2 sm:flex gap-2">
            <Select value={status} onChange={setStatus} icon={<ListFilter size={14} />}>
              <option value="open">Open work</option>
              <option value="all">All statuses</option>
              <option value="overdue">Overdue</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select value={owner} onChange={setOwner} icon={<Filter size={14} />}>
              <option value="all">All people</option>
              <option value="unassigned">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </Select>
            <Select value={project} onChange={setProject} icon={<Filter size={14} />}>
              <option value="all">All projects</option>
              <option value="none">No project</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Select value={sort} onChange={setSort} icon={<SlidersHorizontal size={14} />}>
              <option value="due">Sort: due date</option>
              <option value="priority">Sort: priority</option>
              <option value="updated">Sort: recently updated</option>
              <option value="title">Sort: title</option>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/70">
          <p className="text-xs text-text-muted">Showing {filtered.length} of {tasks.length} tasks</p>
          <button onClick={() => setCompact((value) => !value)} className="text-xs font-semibold text-text-secondary hover:text-text-primary">{compact ? "Comfortable density" : "Compact density"}</button>
        </div>
      </div>

      {checked.size > 0 && (
        <div className="sticky top-[76px] z-20 mb-3 border border-accent/20 bg-accent-soft rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
          <span className="text-sm font-semibold text-accent-text">{checked.size} selected</span>
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2.5 py-1.5">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={applyBulkStatus} disabled={isPending} className="text-sm font-semibold bg-accent text-white rounded-lg px-3 py-1.5">Apply status</button>
          <button onClick={() => setChecked(new Set())} className="text-sm text-text-secondary">Clear</button>
        </div>
      )}

      <div className="border border-border bg-surface overflow-hidden" style={{ borderRadius: "20px 10px 10px 10px" }}>
        <div className="hidden md:grid grid-cols-[34px_minmax(260px,1fr)_140px_150px_130px_110px] gap-3 px-4 py-2.5 bg-page/60 border-b border-border text-[11px] uppercase tracking-[0.1em] text-text-muted font-semibold sticky top-16 z-10">
          <button onClick={toggleAllVisible} aria-label="Select all visible" className="flex items-center"><SelectionBox checked={filtered.length > 0 && filtered.every((task) => checked.has(task.id))} /></button>
          <span>Task</span><span>Status</span><span>Owner</span><span>Project</span><span>Due</span>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((task) => (
            <div key={task.id} className={`group grid md:grid-cols-[34px_minmax(260px,1fr)_140px_150px_130px_110px] gap-2 md:gap-3 items-center px-3 sm:px-4 ${compact ? "py-2" : "py-3"} hover:bg-page/50`}>
              <div className="hidden md:flex"><button onClick={() => toggleChecked(task.id)} aria-label={`Select ${task.title}`}><SelectionBox checked={checked.has(task.id)} /></button></div>
              <div className="min-w-0 flex items-start gap-2.5">
                <button onClick={() => quickComplete(task)} disabled={isPending} aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"} className="mt-0.5 shrink-0">
                  {task.status === "completed" ? <CheckCircle2 size={17} className="text-sage" /> : <Circle size={17} className="text-border-strong group-hover:text-accent" />}
                </button>
                <button onClick={() => setSelected(task)} className="text-left min-w-0">
                  <div className={`text-sm font-medium leading-5 break-words ${task.status === "completed" ? "line-through text-text-muted" : ""}`}>{task.title}</div>
                  <div className="md:hidden text-xs text-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    <span>{statusLabel(task.status)}</span><span>{task.owner?.name ?? "Unassigned"}</span><span>{task.project?.name ?? "No project"}</span><span>{dueLabel(task.dueAt, task.status)}</span>
                  </div>
                </button>
              </div>
              <div className="hidden md:block"><StatusPill status={task.status} /></div>
              <span className="hidden md:block text-xs text-text-secondary truncate">{task.owner?.name ?? "Unassigned"}</span>
              <span className="hidden md:block text-xs text-text-secondary truncate">{task.project?.name ?? "No project"}</span>
              <span className={`hidden md:block text-xs font-medium ${dueTone(task.dueAt, task.status)}`}>{dueLabel(task.dueAt, task.status)}</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-12 text-center"><div className="font-voice text-lg font-semibold">No tasks match these filters</div><p className="text-sm text-text-muted mt-1">Clear a filter or try a different search.</p></div>}
        </div>
      </div>

      {selected && <TaskQuickPreview task={selected} onClose={() => setSelected(null)} onStatus={(next) => {
        const previous = selected.status;
        setSelected({ ...selected, status: next });
        setTasks((rows) => rows.map((row) => row.id === selected.id ? { ...row, status: next } : row));
        startTransition(async () => {
          try { await updateTaskStatus({ taskId: selected.id, status: next as "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed" | "cancelled" }); }
          catch {
            setSelected((current) => current ? { ...current, status: previous } : null);
            setTasks((rows) => rows.map((row) => row.id === selected.id ? { ...row, status: previous } : row));
          }
        });
      }} />}
    </div>
  );
}

function Select({ value, onChange, icon, children }: { value: string; onChange: (value: string) => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 border border-border bg-surface rounded-xl px-2.5 py-2 text-xs text-text-secondary min-w-0">
      {icon}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent outline-none min-w-0 flex-1 appearance-none cursor-pointer">{children}</select>
      <ChevronDown size={12} className="text-text-muted shrink-0" />
    </label>
  );
}

function SelectionBox({ checked }: { checked: boolean }) {
  return <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "bg-accent border-accent text-white" : "border-border-strong bg-surface"}`}>{checked && <Check size={11} />}</span>;
}

function TaskQuickPreview({ task, onClose, onStatus }: { task: ExplorerTask; onClose: () => void; onStatus: (status: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Task: ${task.title}`}>
      <button className="absolute inset-0 bg-text-primary/20 backdrop-blur-[1px]" onClick={onClose} aria-label="Close task preview" />
      <aside className="relative h-full w-full max-w-xl bg-surface border-l border-border shadow-2xl overflow-y-auto p-5 sm:p-7 animate-slide-in">
        <div className="flex items-center justify-between mb-7">
          <div className="text-xs text-text-muted">{task.project?.name ?? "No project"}</div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-sunk" aria-label="Close"><X size={17} /></button>
        </div>
        <h2 className="font-voice text-2xl sm:text-3xl font-semibold leading-tight mb-6">{task.title}</h2>
        <div className="grid grid-cols-2 gap-3 mb-7">
          <div className="rounded-2xl bg-page p-3.5"><div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-1">Owner</div><div className="text-sm font-medium">{task.owner?.name ?? "Unassigned"}</div></div>
          <div className="rounded-2xl bg-page p-3.5"><div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-1">Due</div><div className={`text-sm font-medium ${dueTone(task.dueAt, task.status)}`}>{dueLabel(task.dueAt, task.status)}</div></div>
          <div className="rounded-2xl bg-page p-3.5"><div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-1">Priority</div><div className="text-sm font-medium capitalize">{task.priority}</div></div>
          <div className="rounded-2xl bg-page p-3.5"><div className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-1">Status</div><StatusPill status={task.status} /></div>
        </div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-[0.1em] mb-2">Change status</label>
        <select value={task.status} onChange={(event) => onStatus(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm mb-7">
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Link href={`/tasks/${task.id}`} className="inline-flex items-center justify-center w-full bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold">Open full task details</Link>
        <p className="text-xs text-text-muted mt-3 text-center">This preview opens instantly from the data already loaded on the page.</p>
      </aside>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    backlog: "bg-surface-sunk text-text-secondary",
    not_started: "bg-page text-text-secondary",
    in_progress: "bg-accent-soft text-accent-text",
    waiting: "bg-gold-soft text-gold-text",
    blocked: "bg-plum-soft text-plum-text",
    needs_review: "bg-sage-soft text-sage-text",
    completed: "bg-sage-soft text-sage-text",
    cancelled: "bg-surface-sunk text-text-muted",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[status] ?? tones.not_started}`}>{statusLabel(status)}</span>;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dueLabel(dueAt: string | null, status: string) {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (!dueAt) return "No due date";
  const due = new Date(dueAt);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return due.toLocaleDateString("en-US", { weekday: "short" });
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueTone(dueAt: string | null, status: string) {
  if (!dueAt || ["completed", "cancelled"].includes(status)) return "text-text-muted";
  return new Date(dueAt) < new Date() ? "text-brick-text" : "text-text-secondary";
}
