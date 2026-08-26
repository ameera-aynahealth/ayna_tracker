import { getOrCreateCurrentUser } from "@/lib/auth";
import { getHomeSummary, getTopPriorities, getProjectsWithProgress, getTeamWorkload } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskStatCard } from "@/components/task-stat-card";
import { PriorityCard } from "@/components/priority-card";
import Link from "next/link";

export default async function HomePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [summary, priorities, projects, team] = await Promise.all([
    getHomeSummary(user.id),
    getTopPriorities(user.id),
    getProjectsWithProgress(),
    getTeamWorkload(),
  ]);

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <AppShell active="Home" currentUserName={user.name}>
      <div className="mb-7">
        <h1 className="font-voice text-3xl font-semibold mb-1">Welcome back, {firstName}</h1>
        <p className="text-sm text-text-secondary">
          Ready to work on Ayna? You have{" "}
          <Link href="/my-work" className="text-brick-text font-semibold">{summary.overdue} overdue tasks</Link>,{" "}
          <Link href="/my-work" className="text-gold-text font-semibold">{summary.dueToday} due today</Link>, and{" "}
          <Link href="/my-work" className="text-plum-text font-semibold">{summary.waiting} item{summary.waiting === 1 ? "" : "s"} waiting</Link> on someone else.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-7">
        <TaskStatCard label="Overdue" value={summary.overdue} tone="brick" />
        <TaskStatCard label="Due today" value={summary.dueToday} tone="gold" />
        <TaskStatCard label="Due this week" value={summary.dueThisWeek} tone="accent" />
        <TaskStatCard label="Blocked" value={summary.blocked} tone="plum" />
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-voice text-lg font-semibold">What should I work on next?</h2>
        <Link href="/my-work" className="text-sm text-text-muted">View all my work</Link>
      </div>

      {priorities.length === 0 ? (
        <div className="border border-border rounded-xl bg-surface p-6 text-sm text-text-secondary mb-7">
          Nothing urgent right now. You&apos;re caught up.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-7">
          {priorities.map((t) => (
            <PriorityCard key={t.id} task={t} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border bg-surface p-5" style={{ borderRadius: "20px 10px 10px 10px" }}>
          <h3 className="font-voice text-base font-semibold mb-3">Project health</h3>
          <div className="flex flex-col gap-3">
            {projects.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-xs text-text-muted ml-2 shrink-0">{p.tasksDone}/{p.taskCount}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-sunk overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${p.progressPct}%` }} />
                  </div>
                </div>
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-text-muted">No projects yet.</p>}
          </div>
        </div>

        <div className="border border-border bg-surface p-5" style={{ borderRadius: "20px 10px 10px 10px" }}>
          <h3 className="font-voice text-base font-semibold mb-3">Team workload</h3>
          <div className="flex flex-col gap-3.5">
            {team.map((t) => (
              <div key={t.user.id} className="flex items-center gap-3">
                <span className="text-sm w-20 shrink-0 truncate">{t.user.name.split(" ")[0]}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-sunk overflow-hidden">
                  <div
                    className="h-full bg-accent opacity-75 rounded-full"
                    style={{ width: `${Math.min(100, (t.active / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-24 text-right shrink-0">
                  {t.active} active{t.overdue ? `, ${t.overdue} late` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
