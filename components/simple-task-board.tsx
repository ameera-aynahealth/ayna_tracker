"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Circle, Filter, Search, X } from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/tasks";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  project: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

type Tab = "mine" | "team" | "all";

export function SimpleTaskBoard({
  mine,
  all,
  currentUserId,
  people,
  projects,
}: {
  mine: Task[];
  all: Task[];
  currentUserId: string;
  people: Option[];
  projects: Option[];
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("all");
  const [project, setProject] = useState("all");

  const rows = useMemo(() => {
    let base = tab === "mine"
      ? mine
      : tab === "team"
        ? all.filter((task) => !["completed", "cancelled"].includes(task.status))
        : all;

    const clean = query.trim().toLowerCase();
    base = base.filter((task) => {
      const matchesQuery = !clean || `${task.title} ${task.project?.name ?? ""} ${task.owner?.name ?? ""}`.toLowerCase().includes(clean);
      const matchesStatus = status === "all"
        || (status === "open" && !["completed", "cancelled"].includes(task.status))
        || task.status === status;
      const matchesOwner = owner === "all" || (owner === "me" ? task.owner?.id === currentUserId : task.owner?.id === owner);
      const matchesProject = project === "all" || task.project?.id === project;
      return matchesQuery && matchesStatus && matchesOwner && matchesProject;
    });

    return [...base].sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [all, currentUserId, mine, owner, project, query, status, tab]);

  const groups = tab === "mine" ? groupMine(rows) : [{ title: tab === "team" ? "Team tasks" : "All tasks", rows }];
  const activeFilters = [status !== "open", owner !== "all", project !== "all"].filter(Boolean).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="inline-flex rounded-xl bg-surface border border-border p-1 self-start">
          {(["mine", "team", "all"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${tab === item ? "bg-accent text-white" : "text-text-secondary hover:bg-page"}`}
            >
              {item === "mine" ? "Mine" : item === "team" ? "Team" : "All"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="flex items-center gap-2 border border-border bg-surface rounded-xl px-3 py-2.5 flex-1 sm:w-72">
            <Search size={15} className="text-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="bg-transparent outline-none text-sm flex-1 min-w-0" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} className="text-text-muted" /></button>}
          </label>
          <button onClick={() => setFiltersOpen((value) => !value)} className={`flex items-center gap-1.5 border rounded-xl px-3 py-2.5 text-sm font-semibold ${filtersOpen || activeFilters ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface text-text-secondary"}`}>
            <Filter size={14} /> Filter{activeFilters ? ` ${activeFilters}` : ""}
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="border border-border bg-surface rounded-2xl p-3 mb-5 grid sm:grid-cols-3 gap-2">
          <SimpleSelect value={status} onChange={setStatus}>
            <option value="open">Open work</option>
            <option value="all">All statuses</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
            <option value="blocked">Blocked</option>
            <option value="needs_review">Needs review</option>
            <option value="completed">Completed</option>
          </SimpleSelect>
          <SimpleSelect value={owner} onChange={setOwner}>
            <option value="all">All people</option>
            <option value="me">Me</option>
            {people.filter((person) => person.id !== currentUserId).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </SimpleSelect>
          <SimpleSelect value={project} onChange={setProject}>
            <option value="all">All projects</option>
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SimpleSelect>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => group.rows.length ? (
          <section key={group.title}>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-voice text-lg font-semibold">{group.title}</h2>
              <span className="text-xs text-text-muted">{group.rows.length}</span>
            </div>
            <div className="border border-border bg-surface divide-y divide-border overflow-hidden rounded-2xl">
              {group.rows.map((task) => <SimpleTaskRow key={task.id} task={task} />)}
            </div>
          </section>
        ) : null)}
      </div>

      {rows.length === 0 && (
        <div className="border border-border bg-surface rounded-2xl p-10 text-center">
          <div className="font-voice text-lg font-semibold">Nothing here right now</div>
          <p className="text-sm text-text-muted mt-1">You are caught up, or these filters have no matches.</p>
        </div>
      )}
    </div>
  );
}

function SimpleSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center border border-border rounded-xl px-3 py-2.5 text-sm text-text-secondary">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent outline-none flex-1 appearance-none">{children}</select>
      <ChevronDown size={13} className="text-text-muted" />
    </label>
  );
}

function SimpleTaskRow({ task }: { task: Task }) {
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [isPending, startTransition] = useTransition();
  const done = currentStatus === "completed";

  function toggle(event: React.MouseEvent) {
    event.preventDefault();
    const next = done ? "not_started" : "completed";
    const previous = currentStatus;
    setCurrentStatus(next);
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: next });
      } catch {
        setCurrentStatus(previous);
      }
    });
  }

  return (
    <Link href={`/tasks/${task.id}`} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-page/55 transition-colors">
      <button onClick={toggle} disabled={isPending} aria-label={done ? "Mark incomplete" : "Mark complete"} className="shrink-0">
        {done ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-border-strong group-hover:text-accent" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium leading-5 ${done ? "line-through text-text-muted" : "text-text-primary"}`}>{task.title}</div>
        <div className="text-[11px] text-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-1">
          {task.project && <span>{task.project.name}</span>}
          {task.owner && <span>{task.owner.name}</span>}
          <span>{dueLabel(task.dueAt)}</span>
        </div>
      </div>
      {!done && attentionLabel(currentStatus, task.dueAt) && (
        <span className={`hidden sm:inline rounded-full px-2.5 py-1 text-[10px] font-semibold ${attentionTone(currentStatus, task.dueAt)}`}>
          {attentionLabel(currentStatus, task.dueAt)}
        </span>
      )}
    </Link>
  );
}

function groupMine(rows: Task[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = todayStart + 86400000;
  const nextWeek = todayStart + 7 * 86400000;
  const attention = rows.filter((task) => task.status === "blocked" || task.status === "needs_review" || (task.dueAt && new Date(task.dueAt).getTime() < todayStart));
  const attentionIds = new Set(attention.map((task) => task.id));
  const today = rows.filter((task) => !attentionIds.has(task.id) && task.dueAt && new Date(task.dueAt).getTime() >= todayStart && new Date(task.dueAt).getTime() < tomorrow);
  const todayIds = new Set(today.map((task) => task.id));
  const upcoming = rows.filter((task) => !attentionIds.has(task.id) && !todayIds.has(task.id) && task.dueAt && new Date(task.dueAt).getTime() >= tomorrow && new Date(task.dueAt).getTime() < nextWeek);
  const used = new Set([...attentionIds, ...todayIds, ...upcoming.map((task) => task.id)]);
  const later = rows.filter((task) => !used.has(task.id));
  return [
    { title: "Needs attention", rows: attention },
    { title: "Today", rows: today },
    { title: "Upcoming", rows: upcoming },
    { title: "Later", rows: later },
  ];
}

function dueLabel(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function attentionLabel(status: string, dueAt: string | null) {
  if (status === "blocked") return "Blocked";
  if (status === "needs_review") return "Review";
  if (status === "waiting") return "Waiting";
  if (dueAt && new Date(dueAt).getTime() < new Date().setHours(0, 0, 0, 0)) return "Overdue";
  return null;
}

function attentionTone(status: string, dueAt: string | null) {
  if (status === "blocked" || (dueAt && new Date(dueAt).getTime() < new Date().setHours(0, 0, 0, 0))) return "bg-brick-soft text-brick-text";
  if (status === "needs_review") return "bg-gold-soft text-gold-text";
  return "bg-plum-soft text-plum-text";
}
