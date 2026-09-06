import { getOrCreateCurrentUser } from "@/lib/auth";
import { getTeamWorkload } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TeamMemberActions } from "@/components/team-member-actions";
import { Card, HorizontalBars, MetricCard } from "@/components/visuals";

export default async function TeamPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const team = await getTeamWorkload();
  const totalActive = team.reduce((sum, row) => sum + row.active, 0);
  const totalOverdue = team.reduce((sum, row) => sum + row.overdue, 0);
  const totalBlocked = team.reduce((sum, row) => sum + row.blocked, 0);
  const totalHigh = team.reduce((sum, row) => sum + row.highPriority, 0);
  const maxEffort = Math.max(1, ...team.map((row) => row.effortMinutes));

  return (
    <AppShell active="Team" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Team planning</p>
        <h1 className="font-voice text-3xl font-semibold">Team</h1>
        <p className="text-sm text-text-secondary mt-1">See where help is needed without turning the tracker into an employee leaderboard.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Active work" value={totalActive} tone="accent" />
        <MetricCard label="Overdue" value={totalOverdue} tone="brick" />
        <MetricCard label="Blocked" value={totalBlocked} tone="plum" />
        <MetricCard label="High priority" value={totalHigh} tone="gold" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <Card title="Team capacity" subtitle="Estimated effort is used as a planning signal when available." className="xl:col-span-7">
          <HorizontalBars
            data={team.map((row) => ({
              label: row.user.name,
              value: row.effortMinutes,
              detail: `${row.active} active · ${Math.round(row.effortMinutes / 60)}h est.`,
            }))}
            max={maxEffort}
          />
        </Card>
        <Card title="Where attention is needed" subtitle="Late and blocked work by person." className="xl:col-span-5">
          <div className="space-y-3">
            {team.map((row) => (
              <div key={row.user.id} className="rounded-2xl bg-page p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-text flex items-center justify-center text-xs font-semibold shrink-0">
                    {row.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{row.user.name}</div>
                    <div className="text-[11px] text-text-muted capitalize">{row.user.role}</div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className={row.overdue ? "text-brick-text font-semibold" : "text-text-muted"}>{row.overdue} overdue</div>
                    <div className={row.blocked ? "text-plum-text font-semibold" : "text-text-muted"}>{row.blocked} blocked</div>
                  </div>
                </div>
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-text-muted">No active team members yet.</p>}
          </div>
        </Card>
      </div>

      <Card title="Team work snapshot" subtitle="Admins can remove a teammate without deleting their historical comments or activity.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {team.map((row) => (
            <div key={row.user.id} className="border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent-soft text-accent-text flex items-center justify-center text-xs font-semibold">
                  {row.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{row.user.name}</div>
                  <div className="text-xs text-text-muted capitalize">{row.user.role}</div>
                  <div className="text-[11px] text-text-muted truncate">{row.user.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <SmallMetric value={row.active} label="Active" />
                <SmallMetric value={row.overdue} label="Late" tone="brick" />
                <SmallMetric value={row.blocked} label="Blocked" tone="plum" />
                <SmallMetric value={row.highPriority} label="High" tone="gold" />
              </div>
              {user.role === "admin" && row.user.id !== user.id && (
                <TeamMemberActions userId={row.user.id} userName={row.user.name} />
              )}
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function SmallMetric({ value, label, tone }: { value: number; label: string; tone?: "brick" | "plum" | "gold" }) {
  const className = tone === "brick" ? "text-brick-text" : tone === "plum" ? "text-plum-text" : tone === "gold" ? "text-gold-text" : "text-text-primary";
  return <div className="rounded-xl bg-page py-2"><div className={`font-voice text-lg font-semibold ${className}`}>{value}</div><div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div></div>;
}
