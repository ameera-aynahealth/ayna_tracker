import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import {
  getDashboardVisuals,
  getHomeSummary,
  getProjectsWithProgress,
  getTeamWorkload,
  getTopPriorities,
} from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { PriorityCard } from "@/components/priority-card";
import {
  Card,
  HorizontalBars,
  MetricCard,
  MiniColumnChart,
  ProgressRing,
  StackedDistribution,
  humanize,
} from "@/components/visuals";

export default async function HomePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [summary, priorities, projects, team, visuals] = await Promise.all([
    getHomeSummary(user.id),
    getTopPriorities(user.id),
    getProjectsWithProgress(),
    getTeamWorkload(),
    getDashboardVisuals(user.id),
  ]);

  const firstName = user.name.split(" ")[0] || user.name;
  const statusData = Object.entries(visuals.statusCounts).map(([label, value]) => ({ label, value }));
  const deadlineData = visuals.nextSevenDays.map((day, index) => ({
    label: index === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "short" }),
    value: day.count,
  }));
  const teamMax = Math.max(1, ...team.map((row) => row.effortMinutes));

  return (
    <AppShell active="Home" currentUser={user}>
      <section className="mb-8">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Ayna workspace</p>
        <h1 className="font-voice text-3xl sm:text-4xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        <p className="font-voice text-xl sm:text-2xl text-text-secondary mt-1">Ready to work on Ayna?</p>
        <p className="text-sm text-text-secondary mt-3 max-w-3xl">
          You have{" "}
          <Link href="/my-work?view=overdue" className="text-brick-text font-semibold hover:underline">{summary.overdue} overdue</Link>,{" "}
          <Link href="/my-work?view=today" className="text-gold-text font-semibold hover:underline">{summary.dueToday} due today</Link>,{" "}
          <Link href="/my-work?view=waiting" className="text-plum-text font-semibold hover:underline">{summary.waiting} waiting</Link>, and{" "}
          <Link href="/my-work?view=blocked" className="text-plum-text font-semibold hover:underline">{summary.blocked} blocked</Link>.
        </p>
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-7">
        <MetricCard label="Overdue" value={summary.overdue} detail="Needs attention" tone="brick" href="/my-work?view=overdue" />
        <MetricCard label="Due today" value={summary.dueToday} detail="Your immediate work" tone="gold" href="/my-work?view=today" />
        <MetricCard label="Due this week" value={summary.dueThisWeek} detail="Next seven days" tone="accent" href="/my-work?view=upcoming" />
        <MetricCard label="Blocked" value={summary.blocked} detail="Needs an unblock" tone="plum" href="/my-work?view=blocked" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <Card
          title="What should I work on next?"
          subtitle="Your highest-impact work, automatically prioritized."
          className="xl:col-span-7"
          action={<Link href="/my-work" className="text-xs font-semibold text-accent-text flex items-center gap-1">View all <ArrowRight size={13} /></Link>}
        >
          {priorities.length === 0 ? (
            <div className="py-8 text-center">
              <div className="font-voice text-lg font-semibold">Nothing urgent right now</div>
              <p className="text-sm text-text-muted mt-1">Your priority queue is clear.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {priorities.slice(0, 4).map((task) => <PriorityCard key={task.id} task={task} />)}
            </div>
          )}
        </Card>

        <Card title="Next seven days" subtitle="Your deadline load by day." className="xl:col-span-5">
          <MiniColumnChart data={deadlineData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <Card
          title="Project health"
          subtitle="Progress and problems across active projects."
          className="xl:col-span-7"
          action={<Link href="/projects" className="text-xs font-semibold text-accent-text flex items-center gap-1">All projects <ArrowRight size={13} /></Link>}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.slice(0, 4).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group rounded-2xl bg-page/65 border border-border p-4 hover:border-border-strong transition-colors">
                <div className="flex items-start gap-4">
                  <ProgressRing value={project.progressPct} size={74} />
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="font-medium text-sm leading-5 group-hover:text-accent-text truncate">{project.name}</div>
                    <div className="text-xs text-text-muted capitalize mt-1">{humanize(project.health)}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-secondary mt-2">
                      <span>{project.tasksDone}/{project.taskCount} complete</span>
                      {project.overdueCount > 0 && <span className="text-brick-text font-semibold">{project.overdueCount} overdue</span>}
                      {project.blockedCount > 0 && <span className="text-plum-text font-semibold">{project.blockedCount} blocked</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-text-muted py-5">No active projects yet.</p>}
          </div>
        </Card>

        <Card title="My work mix" subtitle={`${summary.open} open items across statuses.`} className="xl:col-span-5">
          <StackedDistribution data={statusData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card
          title="Team workload"
          subtitle="A planning signal based on estimated effort, not a productivity score."
          className="xl:col-span-7"
          action={<Link href="/team" className="text-xs font-semibold text-accent-text flex items-center gap-1">Team view <ArrowRight size={13} /></Link>}
        >
          <HorizontalBars
            data={team.map((row) => ({
              label: row.user.name,
              value: row.effortMinutes,
              detail: `${row.active} active${row.overdue ? ` · ${row.overdue} late` : ""}`,
            }))}
            max={teamMax}
          />
        </Card>

        <Card title="Needs attention" subtitle="The signals worth checking before you start." className="xl:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/my-work?view=overdue" className="rounded-2xl bg-brick-soft p-4 hover:-translate-y-0.5 transition-transform">
              <div className="font-voice text-2xl font-semibold text-brick-text">{summary.overdue}</div>
              <div className="text-xs text-brick-text mt-1">Overdue</div>
            </Link>
            <Link href="/my-work?view=review" className="rounded-2xl bg-gold-soft p-4 hover:-translate-y-0.5 transition-transform">
              <div className="font-voice text-2xl font-semibold text-gold-text">{summary.needsReview}</div>
              <div className="text-xs text-gold-text mt-1">Needs review</div>
            </Link>
            <Link href="/my-work?view=blocked" className="rounded-2xl bg-plum-soft p-4 hover:-translate-y-0.5 transition-transform">
              <div className="font-voice text-2xl font-semibold text-plum-text">{summary.blocked}</div>
              <div className="text-xs text-plum-text mt-1">Blocked</div>
            </Link>
            <Link href="/my-work?view=waiting" className="rounded-2xl bg-sage-soft p-4 hover:-translate-y-0.5 transition-transform">
              <div className="font-voice text-2xl font-semibold text-sage-text">{summary.waiting}</div>
              <div className="text-xs text-sage-text mt-1">Waiting</div>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
