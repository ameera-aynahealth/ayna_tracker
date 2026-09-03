import { getOrCreateCurrentUser } from "@/lib/auth";
import { getInbox } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { InboxList } from "@/components/inbox-list";

export default async function InboxPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const items = await getInbox(user.id);

  return (
    <AppShell active="Inbox" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Attention queue</p>
        <h1 className="font-voice text-3xl font-semibold">Inbox</h1>
        <p className="text-sm text-text-secondary mt-1">Assignments, mentions, reviews, and deadline notices in one place.</p>
      </div>
      <InboxList initialItems={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />
    </AppShell>
  );
}
