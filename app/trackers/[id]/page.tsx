import { notFound } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveUsers } from "@/lib/queries";
import { getTrackerWithItems } from "@/lib/tracker-queries";
import { AppShell } from "@/components/app-shell";
import { TrackerWorkspace } from "@/components/tracker-workspace";

export default async function TrackerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [data, people] = await Promise.all([getTrackerWithItems(id), getActiveUsers()]);
  if (!data) notFound();

  const { tracker, items } = data;
  const actionCount = items.filter((item) => ["needs_reply", "follow_up", "no_next_step"].includes(item.actionState)).length;
  const waitingCount = items.filter((item) => item.actionState === "waiting").length;

  return (
    <AppShell active="Trackers" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Trackers</p>
        <h1 className="font-voice text-3xl sm:text-4xl font-semibold">{tracker.name}</h1>
        {tracker.description && <p className="text-sm text-text-secondary mt-2 max-w-3xl leading-6">{tracker.description}</p>}
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          <span className="rounded-full bg-page border border-border px-3 py-1.5 text-text-secondary">{items.length} {tracker.itemLabel.toLowerCase()}{items.length === 1 ? "" : "s"}</span>
          <span className={`rounded-full px-3 py-1.5 ${actionCount ? "bg-gold-soft text-gold-text" : "bg-sage-soft text-sage-text"}`}>{actionCount} need action</span>
          <span className="rounded-full bg-plum-soft text-plum-text px-3 py-1.5">{waitingCount} waiting</span>
        </div>
      </div>

      <TrackerWorkspace
        tracker={{ id: tracker.id, name: tracker.name, itemLabel: tracker.itemLabel, stages: tracker.stagesParsed }}
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          stage: item.stage,
          actionState: item.actionState,
          ownerId: item.ownerId,
          owner: item.owner ? { id: item.owner.id, name: item.owner.name } : null,
          contactName: item.contactName,
          contactEmail: item.contactEmail,
          lastContactAt: item.lastContactAt?.toISOString() ?? null,
          nextAction: item.nextAction,
          followupAt: item.followupAt?.toISOString() ?? null,
          notes: item.notes,
        }))}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        currentUserId={user.id}
      />
    </AppShell>
  );
}
