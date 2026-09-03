import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { ensureSep3MeetingTasks } from "@/lib/sep3-meeting-task-bootstrap";
import { repairSep3TasksIntoAppUpdates } from "@/lib/repair-app-updates-tasks";
import { getHomeSummary, getProjectsWithProgress, getTopPriorities } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskRow } from "@/components/task-row";

export default async function HomePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  await ensureSep3MeetingTasks();
  await repairSep3TasksIntoAppUpdates();

  const [summary, priorities, projects] = await Promise.all([
    getHomeSummary(user.id),
    getTopPriorities(user.id, 5),
    getProjectsWithProgress(),
  ]);

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <AppShell active="Home" currentUser={user}>
      <section className="mb-8">
        <h1 className="font-voice text-3xl sm:text-4xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        <p className="font-voice text-xl sm:text-2xl text-text-secondary mt-1">Ready to work on Ayna?</p>
      </section>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-7 max-w-3xl">
        <HomeSignal label="Overdue" value={summary.overdue} href="/tasks" tone="brick" />
        <HomeSignal label="Due today" value={summary.dueToday} href="/tasks" tone="gold" />
        <HomeSignal label="Waiting" value={summary.waiting} href="/tasks" tone="plum" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-5">
        <section>
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <h2 className="font-voice text-xl font-semibold">Your day</h2>
              <p className="text-xs text-text-muted mt-0.5">The few things most worth moving next.</p>
            </div>
            <Link href="/tasks" className="text-xs font-semibold text-accent-text inline-flex items-center gap-1">All tasks <ArrowRight size={12} /></Link>
          </div>
          <div className="border border-border bg-surface divide-y divide-border overflow-hidden rounded-2xl">
            {priorities.map((task) => <TaskRow key={task.id} task={task} />)}
            {priorities.length === 0 && (
              <div className="p-10 text-center">
                <div className="font-voice text-lg font-semibold">Nothing urgent right now</div>
                <p className="text-sm text-text-muted mt-1">Your priority queue is clear.</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section>
            <div className="flex items-end justify-between gap-4 mb-3">
              <div>
                <h2 className="font-voice text-xl font-semibold">Active projects</h2>
                <p className="text-xs text-text-muted mt-0.5">A quick progress check.</p>
              </div>
              <Link href="/projects" className="text-xs font-semibold text-accent-text">View all</Link>
            </div>
            <div className="border border-border bg-surface rounded-2xl divide-y divide-border overflow-hidden">
              {projects.slice(0, 4).map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block p-4 hover:bg-page/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs font-semibold text-text-secondary">{project.progressPct}%</div>
                  </div>
                  <div className="h-1.5 bg-surface-sunk rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${project.progressPct}%` }} />
                  </div>
                  {(project.overdueCount > 0 || project.blockedCount > 0) && (
                    <div className="text-[11px] text-text-muted mt-2">
                      {project.overdueCount > 0 && <span className="text-brick-text font-semibold">{project.overdueCount} overdue</span>}
                      {project.overdueCount > 0 && project.blockedCount > 0 && <span> · </span>}
                      {project.blockedCount > 0 && <span className="text-plum-text font-semibold">{project.blockedCount} blocked</span>}
                    </div>
                  )}
                </Link>
              ))}
              {projects.length === 0 && <div className="p-5 text-sm text-text-muted">No active projects yet.</div>}
            </div>
          </section>

          <Link href="/trackers" className="block border border-border bg-surface rounded-2xl p-5 hover:border-border-strong group">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-voice text-xl font-semibold group-hover:text-accent-text">Trackers</h2>
                <p className="text-sm text-text-secondary mt-1">Partnerships, influencers, outreach, and anything else your team needs to keep moving.</p>
              </div>
              <ArrowRight size={17} className="text-text-muted group-hover:text-accent-text shrink-0" />
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function HomeSignal({ label, value, href, tone }: { label: string; value: number; href: string; tone: "brick" | "gold" | "plum" }) {
  const classes = {
    brick: "bg-brick-soft text-brick-text",
    gold: "bg-gold-soft text-gold-text",
    plum: "bg-plum-soft text-plum-text",
  }[tone];

  return (
    <Link href={href} className={`rounded-2xl p-3 sm:p-4 ${classes} hover:-translate-y-0.5 transition-transform`}>
      <div className="font-voice text-2xl sm:text-3xl font-semibold">{value}</div>
      <div className="text-[11px] sm:text-xs mt-1 font-medium">{label}</div>
    </Link>
  );
}
