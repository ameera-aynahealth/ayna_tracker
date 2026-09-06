"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  archiveTracker,
  archiveTrackerItem,
  createTrackerFollowupTask,
  createTrackerItem,
  updateTrackerItem,
} from "@/lib/actions/trackers";

type Stage = { key: string; label: string };
type Person = { id: string; name: string };
type Item = {
  id: string;
  title: string;
  stage: string;
  actionState: string;
  owner: Person | null;
  ownerId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  lastContactAt: string | null;
  nextAction: string | null;
  followupAt: string | null;
  notes: string | null;
};

type Mode = "action" | "pipeline" | "all";

const actionOptions = [
  ["none", "No action"],
  ["needs_reply", "Needs reply"],
  ["follow_up", "Follow up"],
  ["waiting", "Waiting on them"],
  ["meeting_scheduled", "Meeting scheduled"],
  ["no_next_step", "Needs next step"],
] as const;

export function TrackerWorkspace({
  tracker,
  items,
  people,
  currentUserId,
}: {
  tracker: { id: string; name: string; itemLabel: string; stages: Stage[] };
  items: Item[];
  people: Person[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("action");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [contactEmail, setContactEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const actionItems = useMemo(
    () => items.filter((item) => ["needs_reply", "follow_up", "no_next_step"].includes(item.actionState)),
    [items]
  );
  const visible = mode === "action" ? actionItems : items;

  function submitItem(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await createTrackerItem({
        trackerId: tracker.id,
        title: title.trim(),
        stage: tracker.stages[0]?.key ?? "new",
        ownerId,
        contactEmail: contactEmail.trim() || undefined,
      });
      setTitle("");
      setContactEmail("");
      setAdding(false);
      router.refresh();
    });
  }

  function deleteTracker() {
    if (!window.confirm(`Move ${tracker.name} to Archive?`)) return;
    startTransition(async () => {
      await archiveTracker(tracker.id);
      router.push("/trackers");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="inline-flex rounded-xl bg-surface border border-border p-1 self-start">
          <TabButton active={mode === "action"} onClick={() => setMode("action")}>Needs action {actionItems.length ? `(${actionItems.length})` : ""}</TabButton>
          <TabButton active={mode === "pipeline"} onClick={() => setMode("pipeline")}>Pipeline</TabButton>
          <TabButton active={mode === "all"} onClick={() => setMode("all")}>All</TabButton>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding((value) => !value)} className="inline-flex items-center gap-1.5 bg-accent text-white rounded-xl px-3.5 py-2.5 text-sm font-semibold"><Plus size={15} /> Add {tracker.itemLabel.toLowerCase()}</button>
          <button onClick={deleteTracker} className="p-2.5 rounded-xl border border-border bg-surface text-text-muted hover:text-brick-text" aria-label="Delete tracker"><Trash2 size={15} /></button>
        </div>
      </div>

      {adding && (
        <form onSubmit={submitItem} className="border border-border bg-surface rounded-2xl p-4 mb-5 grid md:grid-cols-[minmax(0,1fr)_220px_260px_auto] gap-2">
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${tracker.itemLabel} name`} className="border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent" />
          <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none">
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Contact email (optional)" className="border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent" />
          <button disabled={isPending} className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Add</button>
        </form>
      )}

      {mode === "pipeline" ? (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-3 min-w-max items-start">
            {tracker.stages.map((stage) => {
              const stageItems = items.filter((item) => item.stage === stage.key);
              return (
                <section key={stage.key} className="w-[290px] shrink-0 rounded-2xl bg-surface-sunk/55 border border-border p-2.5">
                  <div className="flex items-center justify-between px-1.5 py-1.5 mb-1">
                    <h2 className="text-xs font-semibold text-text-secondary">{stage.label}</h2>
                    <span className="text-[11px] text-text-muted">{stageItems.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageItems.map((item) => <TrackerItemCard key={item.id} compact item={item} trackerId={tracker.id} stages={tracker.stages} people={people} />)}
                    {stageItems.length === 0 && <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-muted">Nothing here</div>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-border bg-surface divide-y divide-border overflow-hidden rounded-2xl">
          {visible.map((item) => <TrackerItemCard key={item.id} item={item} trackerId={tracker.id} stages={tracker.stages} people={people} />)}
          {visible.length === 0 && (
            <div className="p-10 text-center">
              <div className="font-voice text-lg font-semibold">{mode === "action" ? "Nothing needs action" : `No ${tracker.itemLabel.toLowerCase()}s yet`}</div>
              <p className="text-sm text-text-muted mt-1">{mode === "action" ? "Everything is waiting, scheduled, or has a next step." : "Add the first item to start tracking it."}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? "bg-accent text-white" : "text-text-secondary hover:bg-page"}`}>{children}</button>;
}

function TrackerItemCard({ item, trackerId, stages, people, compact = false }: { item: Item; trackerId: string; stages: Stage[]; people: Person[]; compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nextAction, setNextAction] = useState(item.nextAction ?? "");
  const [followupAt, setFollowupAt] = useState(item.followupAt ? item.followupAt.slice(0, 10) : "");
  const [contactName, setContactName] = useState(item.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(item.contactEmail ?? "");

  function patch(values: Parameters<typeof updateTrackerItem>[0]) {
    startTransition(async () => {
      await updateTrackerItem(values);
      router.refresh();
    });
  }

  const due = item.followupAt ? new Date(item.followupAt) : null;
  const overdue = due && due.getTime() < new Date().setHours(0, 0, 0, 0) && !["waiting", "meeting_scheduled", "none"].includes(item.actionState);

  return (
    <div className={`${compact ? "rounded-xl border border-border bg-surface p-3" : "p-4"}`}>
      <div className={`flex ${compact ? "flex-col" : "flex-col lg:flex-row lg:items-center"} gap-3`}>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-5 break-words">{item.title}</div>
          <div className="text-[11px] text-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-1">
            {item.owner && <span>{item.owner.name}</span>}
            {item.contactEmail && <span>{item.contactEmail}</span>}
            {item.lastContactAt && <span>Last contact {new Date(item.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            {item.followupAt && <span className={overdue ? "text-brick-text font-semibold" : ""}>Follow up {new Date(item.followupAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          </div>
          {item.nextAction && <div className="text-xs text-text-secondary mt-2"><span className="font-semibold">Next:</span> {item.nextAction}</div>}
        </div>

        <div className={`flex ${compact ? "flex-col" : "flex-wrap"} gap-2 shrink-0`}>
          <select value={item.stage} onChange={(event) => patch({ itemId: item.id, trackerId, stage: event.target.value })} disabled={isPending} className="border border-border bg-page rounded-lg px-2.5 py-2 text-xs outline-none">
            {stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
          </select>
          <select value={item.actionState} onChange={(event) => patch({ itemId: item.id, trackerId, actionState: event.target.value as Parameters<typeof updateTrackerItem>[0]["actionState"] })} disabled={isPending} className={`border rounded-lg px-2.5 py-2 text-xs outline-none ${actionTone(item.actionState)}`}>
            {actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {!compact && (
            <select value={item.ownerId ?? ""} onChange={(event) => patch({ itemId: item.id, trackerId, ownerId: event.target.value || null })} disabled={isPending} className="border border-border bg-page rounded-lg px-2.5 py-2 text-xs outline-none">
              <option value="">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {!compact && (
        <details className="mt-3 group/details">
          <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary">Details <ChevronDown size={12} className="group-open/details:rotate-180 transition-transform" /></summary>
          <div className="mt-3 grid md:grid-cols-2 gap-2 rounded-xl bg-page border border-border p-3">
            <label className="text-[11px] text-text-muted">Next step
              <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Send follow-up email" className="mt-1 block w-full border border-border bg-surface rounded-lg px-2.5 py-2 text-xs text-text-primary outline-none" />
            </label>
            <label className="text-[11px] text-text-muted">Follow-up date
              <input type="date" value={followupAt} onChange={(event) => setFollowupAt(event.target.value)} className="mt-1 block w-full border border-border bg-surface rounded-lg px-2.5 py-2 text-xs text-text-primary outline-none" />
            </label>
            <label className="text-[11px] text-text-muted">Contact name
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 block w-full border border-border bg-surface rounded-lg px-2.5 py-2 text-xs text-text-primary outline-none" />
            </label>
            <label className="text-[11px] text-text-muted">Contact email
              <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1 block w-full border border-border bg-surface rounded-lg px-2.5 py-2 text-xs text-text-primary outline-none" />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-1">
              <button onClick={() => patch({ itemId: item.id, trackerId, nextAction, followupAt: followupAt || null, contactName, contactEmail })} disabled={isPending} className="bg-accent text-white rounded-lg px-3 py-2 text-xs font-semibold">Save details</button>
              <button onClick={() => startTransition(async () => { await createTrackerFollowupTask({ itemId: item.id, trackerId }); router.refresh(); })} disabled={isPending} className="border border-border bg-surface rounded-lg px-3 py-2 text-xs font-semibold text-text-secondary">Create task from next step</button>
              <button onClick={() => { if (window.confirm(`Remove ${item.title} from this tracker?`)) startTransition(async () => { await archiveTrackerItem(item.id, trackerId); router.refresh(); }); }} disabled={isPending} className="ml-auto text-xs font-semibold text-brick-text">Remove</button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function actionTone(state: string) {
  if (state === "needs_reply" || state === "follow_up" || state === "no_next_step") return "border-gold/20 bg-gold-soft text-gold-text";
  if (state === "waiting") return "border-plum/20 bg-plum-soft text-plum-text";
  if (state === "meeting_scheduled") return "border-sage/20 bg-sage-soft text-sage-text";
  return "border-border bg-page text-text-secondary";
}
