"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ListFilter,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/tasks";

export type ProjectTaskListItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  updatedAt: string;
  project: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
};

const statusOptions = [
  ["all", "All statuses"],
  ["open", "Open work"],
  ["overdue", "Overdue"],
  ["backlog", "Backlog"],
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["waiting", "Waiting"],
  ["blocked", "Blocked"],
  ["needs_review", "Needs Review"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

const priorityOptions = [
  ["all", "All priorities"],
  ["urgent", "Urgent"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
] as const;

const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function ProjectTaskList({
  initialTasks,
  people,
}: {
  initialTasks: ProjectTaskListItem[];
  people: Array<{ id: string; name: string }>;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("priority_due");
  const [compact, setCompact] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const now = new Date();
    let rows = tasks.filter((task) => {
      const text = `${task.title} ${task.owner?.name ?? ""}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesStatus =
        status === "all" ||
        (status === "open" && !["completed", "cancelled"].includes(task.status)) ||
        (status === "overdue" && Boolean(task.dueAt) && new Date(task.dueAt as string) < now && !["completed", "cancelled"].includes(task.status)) ||
        task.status === status;
      const matchesOwner = owner === "all" || (owner === "unassigned" ? !task.owner : task.owner?.id === owner);
      const matchesPriority = priority === "all" || task.priority === priority;
      return matchesQuery && matchesStatus && matchesOwner && matchesPriority;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "due") return dueValue(a.dueAt) - dueValue(b.dueAt);
      const priorityDelta = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      return priorityDelta || dueValue(a.dueAt) - dueValue(b.dueAt);
    });

    return rows;
  }, [tasks, query, status, owner, priority, sort]);

  function quickComplete(task: ProjectTaskListItem) {
    const nextStatus = task.status === "completed" ? "not_started" : "completed";
    const previous = task.status;
    setTasks((rows) => rows.map((row) => row.id === task.id ? { ...row, status: nextStatus } : row));
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: nextStatus });
      } catch {
        setTasks((rows) => rows.map((row) => row.id === task.id ? { ...row, status: previous } : row));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="border border-border bg-surface p-3 sm:p-4" style={{ borderRadius: "18px 9px 9px 9px" }}>
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          <label className="flex items-center gap-2 bg-page border border-border rounded-xl px-3 py-2.5 xl:min-w-80 flex-1">
            <Search size={15} className="text-text-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search project tasks or owners"
              className="bg-transparent outline-none text-sm flex-1 min-w-0"
            />
          </label>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Select value={status} onChange={setStatus} icon={<ListFilter size={14} />}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select value={owner} onChange={setOwner} icon={<UserRound size={14} />}>
              <option value="all">All people</option>
              <option value="unassigned">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </Select>
            <Select value={priority} onChange={setPriority} icon={<ListFilter size={14} />}>
              {priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select value={sort} onChange={setSort} icon={<SlidersHorizontal size={14} />}>
              <option value="priority_due">Sort: priority, then due</option>
              <option value="due">Sort: due date</option>
              <option value="updated">Sort: recently updated</option>
              <option value="title">Sort: title</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/70">
          <p className="text-xs text-text-muted">Showing {filtered.length} of {tasks.length} tasks</p>
          <button
            onClick={() => setCompact((value) => !value)}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            {compact ? "Comfortable density" : "Compact density"}
          </button>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((task) => (
          <div key={task.id} className="rounded-2xl border border-border bg-surface p-3.5">
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => quickComplete(task)}
                disabled={isPending}
                aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                className="mt-0.5 shrink-0"
              >
                {task.status === "completed" ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-border-strong" />}
              </button>
              <div className="min-w-0 flex-1">
                <Link href={`/tasks/${task.id}`} className={`text-sm font-medium leading-5 break-words ${task.status === "completed" ? "line-through text-text-muted" : ""}`}>
                  {task.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <PriorityPill priority={task.priority} />
                  <StatusPill status={task.status} />
                  <span className={`text-xs font-medium ${dueTone(task.dueAt, task.status)}`}>{dueLabel(task.dueAt, task.status)}</span>
                  <span className="text-xs text-text-muted">{task.owner?.name ?? "Unassigned"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block border border-border bg-surface overflow-x-auto" style={{ borderRadius: "20px 10px 10px 10px" }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[34px_minmax(320px,1fr)_110px_140px_160px_120px] gap-3 px-4 py-3 bg-page/60 border-b border-border text-[11px] uppercase tracking-[0.1em] text-text-muted font-semibold">
            <span />
            <span>Task</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Due</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={`group grid grid-cols-[34px_minmax(320px,1fr)_110px_140px_160px_120px] gap-3 items-center px-4 ${compact ? "py-2" : "py-3"} hover:bg-page/50`}
              >
                <button
                  onClick={() => quickComplete(task)}
                  disabled={isPending}
                  aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                  className="shrink-0"
                >
                  {task.status === "completed" ? <CheckCircle2 size={17} className="text-sage" /> : <Circle size={17} className="text-border-strong group-hover:text-accent" />}
                </button>
                <Link href={`/tasks/${task.id}`} className={`text-sm font-medium leading-5 break-words ${task.status === "completed" ? "line-through text-text-muted" : ""}`}>
                  {task.title}
                </Link>
                <div><PriorityPill priority={task.priority} /></div>
                <div><StatusPill status={task.status} /></div>
                <span className="text-xs text-text-secondary truncate">{task.owner?.name ?? "Unassigned"}</span>
                <span className={`text-xs font-medium ${dueTone(task.dueAt, task.status)}`}>{dueLabel(task.dueAt, task.status)}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <div className="font-voice text-lg font-semibold">No tasks match these filters</div>
                <p className="text-sm text-text-muted mt-1">Clear a filter or try a different search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  icon,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 border border-border bg-surface rounded-xl px-2.5 py-2 text-xs text-text-secondary min-w-0">
      {icon}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent outline-none min-w-0 flex-1 appearance-none cursor-pointer">
        {children}
      </select>
      <ChevronDown size={12} className="text-text-muted shrink-0" />
    </label>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const tones: Record<string, string> = {
    urgent: "bg-brick-soft text-brick-text",
    high: "bg-gold-soft text-gold-text",
    medium: "bg-accent-soft text-accent-text",
    low: "bg-sage-soft text-sage-text",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tones[priority] ?? "bg-page text-text-secondary"}`}>{priority}</span>;
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

function dueValue(dueAt: string | null) {
  return dueAt ? new Date(dueAt).getTime() : Number.MAX_SAFE_INTEGER;
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
