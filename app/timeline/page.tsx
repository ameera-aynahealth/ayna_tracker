import Link from "next/link";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getAllTasks, getProjectsWithProgress } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/visuals";

export default async function TimelinePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const [tasks, projects] = await Promise.all([getAllTasks({ limit: 1000 }), getProjectsWithProgress()]);

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const rangeEnd = new Date(rangeStart.getTime() + 97 * 86400000);
  const span = rangeEnd.getTime() - rangeStart.getTime();
  const timelineTasks = tasks.filter((task) => task.dueAt && task.dueAt >= rangeStart && task.dueAt <= rangeEnd && !["completed", "cancelled"].includes(task.status));
  const milestoneLike = projects.filter((project) => project.dueDate && project.dueDate >= rangeStart && project.dueDate <= rangeEnd);
  const urgent = timelineTasks.filter((task) => task.priority === "urgent").length;
  const atRisk = milestoneLike.filter((project) => project.health === "at_risk" || project.health === "blocked" || project.health === "needs_attention").length;

  const grouped = projects.map((project) => ({
    project,
    tasks: timelineTasks.filter((task) => task.project?.id === project.id),
  })).filter((group) => group.tasks.length > 0 || group.project.dueDate);

  const markers = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(rangeStart.getTime() + index * 14 * 86400000);
    return { date, left: ((date.getTime() - rangeStart.getTime()) / span) * 100 };
  });
  const todayLeft = Math.max(0, Math.min(100, ((now.getTime() - rangeStart.getTime()) / span) * 100));

  return (
    <AppShell active="Timeline" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Long-range planning</p>
        <h1 className="font-voice text-3xl font-semibold">Timeline</h1>
        <p className="text-sm text-text-secondary mt-1">See the next three months of work without turning every project into a giant board.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Scheduled tasks" value={timelineTasks.length} tone="accent" />
        <MetricCard label="Urgent" value={urgent} tone="brick" />
        <MetricCard label="Project deadlines" value={milestoneLike.length} tone="sage" />
        <MetricCard label="Projects at risk" value={atRisk} tone="gold" />
      </div>

      <div className="border border-border bg-surface overflow-hidden" style={{ borderRadius: "20px 10px 10px 10px" }}>
        <div className="grid grid-cols-[220px_minmax(850px,1fr)] border-b border-border bg-page/60 sticky top-16 z-10">
          <div className="p-3 border-r border-border text-[11px] uppercase tracking-[0.1em] font-semibold text-text-muted">Project / task</div>
          <div className="relative h-12">
            {markers.map((marker) => <div key={marker.date.toISOString()} className="absolute top-0 bottom-0 border-l border-border" style={{ left: `${marker.left}%` }}><span className="absolute top-3 left-1.5 whitespace-nowrap text-[10px] text-text-muted">{marker.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1070px]">
            {grouped.map(({ project, tasks: projectTasks }) => (
              <section key={project.id} className="border-b border-border last:border-b-0">
                <div className="grid grid-cols-[220px_minmax(850px,1fr)] bg-page/35">
                  <Link href={`/projects/${project.id}`} className="p-3 border-r border-border font-voice text-sm font-semibold hover:text-accent-text truncate">{project.name}</Link>
                  <div className="relative h-10">
                    <TodayLine left={todayLeft} />
                    {project.dueDate && project.dueDate >= rangeStart && project.dueDate <= rangeEnd && (
                      <div className="absolute top-2 w-3 h-3 rotate-45 bg-accent border-2 border-surface shadow-sm" title={`Project due ${project.dueDate.toLocaleDateString()}`} style={{ left: `calc(${percent(project.dueDate, rangeStart, span)}% - 6px)` }} />
                    )}
                  </div>
                </div>
                {projectTasks.map((task) => {
                  const start = task.startAt && task.startAt < task.dueAt! ? task.startAt : new Date(Math.max(rangeStart.getTime(), task.dueAt!.getTime() - 5 * 86400000));
                  const left = percent(start, rangeStart, span);
                  const right = percent(task.dueAt!, rangeStart, span);
                  const width = Math.max(1.2, right - left);
                  return (
                    <div key={task.id} className="grid grid-cols-[220px_minmax(850px,1fr)] border-t border-border/70">
                      <Link href={`/tasks/${task.id}`} className="p-2.5 pl-5 border-r border-border text-xs text-text-secondary truncate hover:text-accent-text">{task.title}</Link>
                      <div className="relative h-9">
                        <TodayLine left={todayLeft} />
                        {markers.map((marker) => <span key={marker.date.toISOString()} className="absolute inset-y-0 border-l border-border/45" style={{ left: `${marker.left}%` }} />)}
                        <Link href={`/tasks/${task.id}`} title={`${task.title} · due ${task.dueAt!.toLocaleString()}`} className={`absolute top-2 h-5 rounded-full border ${timelineTone(task.status, task.priority)}`} style={{ left: `${left}%`, width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
            {grouped.length === 0 && <div className="p-12 text-center text-sm text-text-muted">No scheduled work falls inside the next three months.</div>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-text-muted"><span><span className="inline-block w-5 h-2 rounded-full bg-accent mr-1.5" />Scheduled work</span><span><span className="inline-block w-5 h-2 rounded-full bg-brick mr-1.5" />Urgent</span><span>The vertical accent line marks today.</span></div>
    </AppShell>
  );
}

function TodayLine({ left }: { left: number }) {
  return <span className="absolute inset-y-0 border-l-2 border-accent/50 z-[1]" style={{ left: `${left}%` }} />;
}

function percent(date: Date, start: Date, span: number) {
  return Math.max(0, Math.min(100, ((date.getTime() - start.getTime()) / span) * 100));
}

function timelineTone(status: string, priority: string) {
  if (status === "blocked") return "bg-plum border-plum";
  if (status === "waiting") return "bg-gold border-gold";
  if (priority === "urgent") return "bg-brick border-brick";
  if (status === "needs_review") return "bg-sage border-sage";
  return "bg-accent border-accent";
}
