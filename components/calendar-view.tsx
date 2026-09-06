"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, UserRound, UsersRound } from "lucide-react";

export type CalendarTask = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  priority: string;
  project: { name: string } | null;
  owner: { name: string } | null;
};

type View = "month" | "week";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ tasks, myTaskIds = [] }: { tasks: CalendarTask[]; myTaskIds?: string[] }) {
  const [view, setView] = useState<View>("month");
  const [scope, setScope] = useState<"mine" | "everyone">("everyone");
  const [anchor, setAnchor] = useState(() => new Date());
  const myTaskIdSet = useMemo(() => new Set(myTaskIds), [myTaskIds]);
  const visibleTasks = scope === "mine" ? tasks.filter((task) => myTaskIdSet.has(task.id)) : tasks;

  const taskMap = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of visibleTasks) {
      const key = localDayKey(new Date(task.dueAt));
      const current = map.get(key) ?? [];
      current.push(task);
      current.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
      map.set(key, current);
    }
    return map;
  }, [visibleTasks]);

  const days = view === "month" ? monthGridDays(anchor) : weekGridDays(anchor);
  const title = view === "month"
    ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  function move(direction: -1 | 1) {
    setAnchor((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button onClick={() => setScope("mine")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "mine" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}>
            <UserRound size={14} />My tasks
          </button>
          <button onClick={() => setScope("everyone")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "everyone" ? "bg-accent-soft text-accent-text" : "text-text-secondary"}`}>
            <UsersRound size={14} />Everyone's tasks
          </button>
        </div>
      </div>

      <div className="border border-border bg-surface p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderRadius: "18px 9px 9px 9px" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-2 rounded-xl hover:bg-surface-sunk" aria-label="Previous period"><ChevronLeft size={16} /></button>
          <button onClick={() => setAnchor(new Date())} className="text-xs font-semibold border border-border rounded-xl px-3 py-2 hover:border-border-strong">Today</button>
          <button onClick={() => move(1)} className="p-2 rounded-xl hover:bg-surface-sunk" aria-label="Next period"><ChevronRight size={16} /></button>
          <h2 className="font-voice text-lg font-semibold ml-1">{title}</h2>
        </div>
        <div className="inline-flex self-start rounded-xl border border-border p-1 bg-page">
          <button onClick={() => setView("month")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "month" ? "bg-surface text-accent-text shadow-sm" : "text-text-secondary"}`}>Month</button>
          <button onClick={() => setView("week")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "week" ? "bg-surface text-accent-text shadow-sm" : "text-text-secondary"}`}>Week</button>
        </div>
      </div>

      <div className="border border-border bg-surface overflow-hidden" style={{ borderRadius: "20px 10px 10px 10px" }}>
        <div className="grid grid-cols-7 border-b border-border bg-page/60">
          {weekDays.map((day) => <div key={day} className="px-2 sm:px-3 py-2 text-center text-[10px] uppercase tracking-[0.1em] font-semibold text-text-muted">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const key = localDayKey(day);
            const dayTasks = taskMap.get(key) ?? [];
            const isToday = key === localDayKey(new Date());
            const isCurrentMonth = day.getMonth() === anchor.getMonth();
            return (
              <div key={`${key}-${index}`} className={`min-h-[130px] sm:min-h-[155px] border-r border-b border-border p-1.5 sm:p-2.5 ${index % 7 === 6 ? "border-r-0" : ""} ${view === "month" && !isCurrentMonth ? "bg-page/35" : ""}`}>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${isToday ? "bg-accent text-white" : isCurrentMonth || view === "week" ? "text-text-secondary" : "text-text-muted"}`}>{day.getDate()}</span>
                  {dayTasks.length > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${heatTone(dayTasks.length)}`}>{dayTasks.length}</span>}
                </div>
                <div className="space-y-1.5">
                  {dayTasks.slice(0, view === "week" ? 8 : 3).map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className={`block rounded-lg border px-2 py-1.5 text-[10px] sm:text-[11px] leading-4 hover:border-border-strong ${taskTone(task)}`} title={`${task.title} · ${task.owner?.name ?? "Unassigned"}`}>
                      <div className="font-medium line-clamp-2">{task.title}</div>
                      <div className="hidden sm:block opacity-70 truncate mt-0.5">{task.project?.name ?? task.owner?.name ?? "Ayna"}</div>
                    </Link>
                  ))}
                  {dayTasks.length > (view === "week" ? 8 : 3) && <div className="text-[10px] text-text-muted px-1">+{dayTasks.length - (view === "week" ? 8 : 3)} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function monthGridDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function weekGridDays(anchor: Date) {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function priorityRank(priority: string) {
  return ({ urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[priority] ?? 9;
}

function taskTone(task: CalendarTask) {
  if (task.priority === "urgent") return "bg-brick-soft border-brick/20 text-brick-text";
  if (task.status === "blocked") return "bg-plum-soft border-plum/20 text-plum-text";
  if (task.status === "waiting") return "bg-gold-soft border-gold/20 text-gold-text";
  return "bg-accent-soft border-accent/15 text-accent-text";
}

function heatTone(count: number) {
  if (count >= 8) return "bg-brick-soft text-brick-text";
  if (count >= 5) return "bg-gold-soft text-gold-text";
  return "bg-surface-sunk text-text-muted";
}
