import { getOrCreateCurrentUser } from "@/lib/auth";
import { getMyWorkBuckets } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskRow } from "@/components/task-row";

export default async function MyWorkPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const buckets = await getMyWorkBuckets(user.id);

  const sections = [
    { title: "Overdue", tasks: buckets.overdue, emphasize: true },
    { title: "Due today", tasks: buckets.dueToday, emphasize: true },
    { title: "Blocked", tasks: buckets.blocked, emphasize: true },
    { title: "Due tomorrow", tasks: buckets.dueTomorrow },
    { title: "This week", tasks: buckets.thisWeek },
    { title: "Waiting", tasks: buckets.waiting },
    { title: "Needs review", tasks: buckets.needsReview },
    { title: "No due date", tasks: buckets.noDueDate },
  ];

  return (
    <AppShell active="My Work" currentUserName={user.name}>
      <h1 className="font-voice text-2xl font-semibold mb-1">My Work</h1>
      <p className="text-sm text-text-secondary mb-6">
        {buckets.overdue.length} overdue &middot; {buckets.dueToday.length} due today &middot;{" "}
        {buckets.thisWeek.length + buckets.dueTomorrow.length} this week &middot; {buckets.waiting.length} waiting &middot;{" "}
        {buckets.blocked.length} blocked
      </p>

      <div className="flex flex-col gap-6">
        {sections.map((s) =>
          s.tasks.length === 0 ? null : (
            <div key={s.title}>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${s.emphasize ? "text-brick-text" : "text-text-muted"}`}>
                {s.title} ({s.tasks.length})
              </h2>
              <div className="border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
                {s.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          )
        )}
        {buckets.all.length === 0 && (
          <div className="border border-border rounded-xl bg-surface p-8 text-center text-sm text-text-secondary">
            Nothing assigned to you yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}
