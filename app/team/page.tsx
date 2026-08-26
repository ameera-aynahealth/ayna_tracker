import { getOrCreateCurrentUser } from "@/lib/auth";
import { getTeamWorkload } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";

export default async function TeamPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const team = await getTeamWorkload();

  return (
    <AppShell active="Team" currentUserName={user.name}>
      <h1 className="font-voice text-2xl font-semibold mb-6">Team</h1>
      <div className="border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
        {team.map((t) => (
          <div key={t.user.id} className="flex items-center gap-4 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-accent-soft text-accent-text flex items-center justify-center text-xs font-semibold shrink-0">
              {t.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t.user.name}</div>
              <div className="text-xs text-text-muted capitalize">{t.user.role}</div>
            </div>
            <div className="text-sm text-text-secondary">{t.active} active</div>
            {t.overdue > 0 && <div className="text-sm font-medium text-brick-text">{t.overdue} overdue</div>}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
