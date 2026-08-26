import { AYNA_CLERK_ORG_ID, getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveUsers, getDataHealthSnapshot } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const [people, dataHealth] = await Promise.all([getActiveUsers(), getDataHealthSnapshot()]);

  const projectUser = (person: typeof user) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    active: person.active,
    notifyOnAssigned: person.notifyOnAssigned,
    notifyOnMentioned: person.notifyOnMentioned,
    notifyOnDueSoon: person.notifyOnDueSoon,
    notifyOnOverdue: person.notifyOnOverdue,
    notifyOnReviewRequested: person.notifyOnReviewRequested,
    notifyOnBlocked: person.notifyOnBlocked,
    notifyOnComment: person.notifyOnComment,
    dailyDigest: person.dailyDigest,
    weeklyDigest: person.weeklyDigest,
  });

  return (
    <AppShell active="Settings" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Workspace controls</p>
        <h1 className="font-voice text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage reminders, Ayna team access, and the health of tracker data.</p>
      </div>
      <SettingsPanel
        currentUser={projectUser(user)}
        people={people.map((person) => projectUser(person as typeof user))}
        organizationId={AYNA_CLERK_ORG_ID}
        dataHealth={dataHealth}
      />
    </AppShell>
  );
}
