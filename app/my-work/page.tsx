import Link from "next/link";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getMyWorkBuckets } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskRow } from "@/components/task-row";
import { MetricCard } from "@/components/visuals";

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const [buckets, params] = await Promise.all([getMyWorkBuckets(user.id), searchParams]);
  const view = params.view ?? "all";

  const upcoming = [...buckets.dueTomorrow, ...buckets.thisWeek];
  const attention = [...buckets.overdue, ...buckets.blocked];
  const filterMap: Record<string, typeof buckets.all> = {
    overdue: buckets.overdue,
    today: buckets.dueToday,
    upcoming,
    waiting: buckets.waiting,
    blocked: buckets.blocked,
    review: buckets.needsReview,
  };

  const sections = view === "all"
    ? [
        { title: "Needs attention", subtitle: "Overdue and blocked work", tasks: attention, tone: "brick" },
        { title: "Today", subtitle: "What needs to move today", tasks: buckets.dueToday, tone: "gold" },
        { title: "Upcoming", subtitle: "Tomorrow through the next seven days", tasks: upcoming, tone: "accent" },
        { title: "Waiting", subtitle: "Work paused while someone else responds", tasks: buckets.waiting, tone: "plum" },
        { title: "Needs review", subtitle: "Items waiting for your decision", tasks: buckets.needsReview, tone: "sage" },
        { title: "No due date", subtitle: "Assigned work that still needs scheduling", tasks: buckets.noDueDate, tone: "muted" },
      ]
    : [{ title: view === "review" ? "Needs review" : view.charAt(0).toUpperCase() + view.slice(1), subtitle: "Filtered view", tasks: filterMap[view] ?? buckets.all, tone: "accent" }];

  return (
    <AppShell active="My Work" currentUser={user}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Personal workspace</p>
          <h1 className="font-voice text-3xl font-semibold">My Work</h1>
          <p className="text-sm text-text-secondary mt-1">Start with what needs attention, not a wall of every task.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Overview"],
            ["overdue", "Overdue"],
            ["today", "Today"],
            ["upcoming", "Upcoming"],
            ["waiting", "Waiting"],
            ["review", "Review"],
          ].map(([key, label]) => (
            <Link key={key} href={key === "all" ? "/my-work" : `/my-work?view=${key}`} className={`text-xs font-semibold px-3 py-2 rounded-full border ${view === key ? "bg-accent text-white border-accent" : "bg-surface border-border text-text-secondary hover:border-border-strong"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <MetricCard label="Overdue" value={buckets.overdue.length} tone="brick" href="/my-work?view=overdue" />
        <MetricCard label="Due today" value={buckets.dueToday.length} tone="gold" href="/my-work?view=today" />
        <MetricCard label="Upcoming" value={upcoming.length} tone="accent" href="/my-work?view=upcoming" />
        <MetricCard label="Waiting" value={buckets.waiting.length} tone="plum" href="/my-work?view=waiting" />
      </div>

      <div className="space-y-6">
        {sections.map((section) => section.tasks.length ? (
          <section key={section.title}>
            <div className="flex items-end justify-between gap-4 mb-2.5">
              <div>
                <h2 className="font-voice text-lg font-semibold">{section.title} <span className="text-text-muted">{section.tasks.length}</span></h2>
                <p className="text-xs text-text-muted">{section.subtitle}</p>
              </div>
            </div>
            <div className="border border-border bg-surface divide-y divide-border overflow-hidden" style={{ borderRadius: "18px 9px 9px 9px" }}>
              {section.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
            </div>
          </section>
        ) : null)}

        {buckets.all.length === 0 && (
          <div className="border border-border bg-surface p-10 text-center" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <div className="font-voice text-xl font-semibold">Nothing assigned to you right now</div>
            <p className="text-sm text-text-muted mt-1">You are caught up.</p>
          </div>
        )}

        {buckets.all.length > 0 && sections.every((section) => section.tasks.length === 0) && (
          <div className="border border-border bg-surface p-8 text-center text-sm text-text-muted rounded-2xl">Nothing in this filtered view.</div>
        )}
      </div>
    </AppShell>
  );
}
