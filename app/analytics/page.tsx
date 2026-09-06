import { getOrCreateCurrentUser } from "@/lib/auth";
import { getAnalyticsSnapshot } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { Card, HorizontalBars, MetricCard, StackedDistribution, TrendChart } from "@/components/visuals";

export default async function AnalyticsPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const analytics = await getAnalyticsSnapshot();

  const created = analytics.createdVsCompleted.map((row) => ({ label: row.label, value: row.created }));
  const completed = analytics.createdVsCompleted.map((row) => ({ label: row.label, value: row.completed }));

  return (
    <AppShell active="Analytics" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Workspace insights</p>
        <h1 className="font-voice text-3xl font-semibold">Analytics</h1>
        <p className="text-sm text-text-secondary mt-1">Use trends to spot workload and deadline problems, not to rank people.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-5">
        <MetricCard label="Active" value={analytics.totals.active} tone="accent" />
        <MetricCard label="Completed" value={analytics.totals.completed} tone="sage" />
        <MetricCard label="Overdue" value={analytics.totals.overdue} tone="brick" />
        <MetricCard label="Blocked" value={analytics.totals.blocked} tone="plum" />
        <MetricCard label="Waiting" value={analytics.totals.waiting} tone="gold" />
        <MetricCard label="On-time rate" value={`${analytics.totals.onTimeRate}%`} tone="sage" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <Card title="Created vs completed" subtitle="Six-week flow of incoming work and finished work." className="xl:col-span-7">
          <TrendChart data={created} secondary={completed} />
          <div className="flex items-center gap-5 mt-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent" />Created</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sage" />Completed</span>
          </div>
        </Card>
        <Card title="Status distribution" subtitle="Current workspace work by canonical status." className="xl:col-span-5">
          <StackedDistribution data={analytics.statusCounts} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <Card title="Completion trend" subtitle="Tasks finished per week." className="xl:col-span-6">
          <TrendChart data={analytics.completionTrend} />
        </Card>
        <Card title="Priority mix" subtitle="How much active work is urgent versus lower priority." className="xl:col-span-6">
          <HorizontalBars data={analytics.priorityCounts} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <Card title="Work by person" subtitle="Active task count is context, not a performance score." className="xl:col-span-6">
          <HorizontalBars data={analytics.ownerCounts} />
        </Card>
        <Card title="Work by workstream" subtitle="Where Ayna's active attention is currently going." className="xl:col-span-6">
          <HorizontalBars data={analytics.workstreamCounts} />
        </Card>
      </div>

      <Card title="Project comparison" subtitle="Completion and risk signals across active projects.">
        <div className="space-y-4">
          {analytics.projects.map((project) => (
            <div key={project.id}>
              <div className="flex items-end justify-between gap-3 mb-1.5">
                <div>
                  <div className="text-sm font-medium">{project.name}</div>
                  <div className="text-[11px] text-text-muted">{project.tasksDone}/{project.taskCount} complete · {project.overdueCount} overdue · {project.blockedCount} blocked</div>
                </div>
                <div className="font-voice text-lg font-semibold">{project.progressPct}%</div>
              </div>
              <div className="h-2 bg-surface-sunk rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${project.progressPct}%` }} /></div>
            </div>
          ))}
          {analytics.projects.length === 0 && <p className="text-sm text-text-muted">No active projects yet.</p>}
        </div>
      </Card>

      {analytics.totals.failedNotifications > 0 && (
        <div className="mt-4 rounded-2xl border border-brick/20 bg-brick-soft p-4 text-sm text-brick-text">
          {analytics.totals.failedNotifications} notification delivery attempt{analytics.totals.failedNotifications === 1 ? "" : "s"} need admin attention.
        </div>
      )}
    </AppShell>
  );
}
