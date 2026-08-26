import { getOrCreateCurrentUser } from "@/lib/auth";
import { getCalendarTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { CalendarView } from "@/components/calendar-view";
import { MetricCard } from "@/components/visuals";

export default async function CalendarPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const tasks = await getCalendarTasks(60);
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const fourteenDays = new Date(now.getTime() + 14 * 86400000);
  const nextSeven = tasks.filter((task) => task.dueAt && task.dueAt < sevenDays).length;
  const nextFourteen = tasks.filter((task) => task.dueAt && task.dueAt >= sevenDays && task.dueAt < fourteenDays).length;
  const urgent = tasks.filter((task) => task.priority === "urgent").length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;

  const serialized = tasks.flatMap((task) => task.dueAt ? [{
    id: task.id,
    title: task.title,
    dueAt: task.dueAt.toISOString(),
    status: task.status,
    priority: task.priority,
    project: task.project ? { name: task.project.name } : null,
    owner: task.owner ? { name: task.owner.name } : null,
  }] : []);

  return (
    <AppShell active="Calendar" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Deadline planning</p>
        <h1 className="font-voice text-3xl font-semibold">Calendar</h1>
        <p className="text-sm text-text-secondary mt-1">See when work is stacking up before a deadline-heavy day becomes a problem.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Next 7 days" value={nextSeven} tone="accent" />
        <MetricCard label="Following week" value={nextFourteen} tone="sage" />
        <MetricCard label="Urgent upcoming" value={urgent} tone="brick" />
        <MetricCard label="Blocked upcoming" value={blocked} tone="plum" />
      </div>

      <CalendarView tasks={serialized} />
    </AppShell>
  );
}
