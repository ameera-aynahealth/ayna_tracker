"use client";

import { FormEvent, useState, useTransition } from "react";
import { CheckCircle2, Circle, ExternalLink, Link2, Save, UsersRound } from "lucide-react";
import { formatDueBadge } from "@/lib/format";
import {
  addAttachmentLink,
  addComment,
  addSubtask,
  requestTaskReview,
  resolveTaskReview,
  setTaskAssignees,
  toggleSubtask,
  updateTaskField,
  updateTaskStatus,
} from "@/lib/actions/tasks";

type Subtask = { id: string; title: string; completed: boolean };
type Comment = { id: string; body: string; createdAt: Date; user: { name: string } };
type Activity = { id: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: Date; user: { name: string } };
type Attachment = { id: string; name: string; url: string; kind: string; createdAt: Date };
type Person = { id: string; name: string };
type PersonLink = { user: Person };
type Project = { id: string; name: string };

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  waitingOnName: string | null;
  waitingOnOrg: string | null;
  followupAt: Date | null;
  blockedReason: string | null;
  reviewRequired: boolean;
  reviewerId: string | null;
  project: Project | null;
  owner: Person | null;
  reviewer: Person | null;
  collaborators: PersonLink[];
  reviewers: PersonLink[];
  subtasks: Subtask[];
  comments: Comment[];
  activity: Activity[];
  attachments: Attachment[];
};

const STATUS_OPTIONS = [
  ["backlog", "Backlog"],
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["waiting", "Waiting"],
  ["blocked", "Blocked"],
  ["needs_review", "Needs Review"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

type TaskStatus = (typeof STATUS_OPTIONS)[number][0];

const badgeToneClasses: Record<string, string> = {
  brick: "bg-brick-soft text-brick-text",
  gold: "bg-gold-soft text-gold-text",
  accent: "bg-accent-soft text-accent-text",
  plum: "bg-plum-soft text-plum-text",
  sage: "bg-sage-soft text-sage-text",
};

export function TaskDetailPanel({
  task,
  currentUser,
  people,
  projects,
}: {
  task: TaskDetail;
  currentUser: { id: string; role: string };
  people: Person[];
  projects: Project[];
}) {
  const initialAssigneeIds = uniqueIds([task.owner?.id, ...task.collaborators.map((row) => row.user.id)]);
  const initialReviewerIds = uniqueIds([task.reviewerId, ...task.reviewers.map((row) => row.user.id)]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(task.status);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialAssigneeIds);
  const [savedAssigneeIds, setSavedAssigneeIds] = useState<string[]>(initialAssigneeIds);
  const [projectId, setProjectId] = useState(task.project?.id ?? "");
  const [dueAt, setDueAt] = useState(toLocalInput(task.dueAt));
  const [waitingOnName, setWaitingOnName] = useState(task.waitingOnName ?? "");
  const [waitingOnOrg, setWaitingOnOrg] = useState(task.waitingOnOrg ?? "");
  const [followupAt, setFollowupAt] = useState(toLocalInput(task.followupAt));
  const [blockedReason, setBlockedReason] = useState(task.blockedReason ?? "");
  const [reviewerIds, setReviewerIds] = useState<string[]>(initialReviewerIds);
  const [activeReviewerIds, setActiveReviewerIds] = useState<string[]>(initialReviewerIds);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const { label, tone } = formatDueBadge(task.dueAt, status);
  const doneCount = task.subtasks.filter((subtask) => subtask.completed).length;

  function flash(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(null), 1600);
  }

  function changeStatus(nextStatus: string) {
    const previous = status;
    setStatus(nextStatus);
    startTransition(async () => {
      try {
        await updateTaskStatus({
          taskId: task.id,
          status: nextStatus as TaskStatus,
          waitingOnName: nextStatus === "waiting" ? waitingOnName || undefined : undefined,
          waitingOnOrg: nextStatus === "waiting" ? waitingOnOrg || undefined : undefined,
          followupAt: nextStatus === "waiting" && followupAt ? new Date(followupAt).toISOString() : undefined,
          blockedReason: nextStatus === "blocked" ? blockedReason || undefined : undefined,
        });
        flash("Status saved");
      } catch {
        setStatus(previous);
      }
    });
  }

  function saveCore() {
    startTransition(async () => {
      try {
        if (title.trim() !== task.title) await updateTaskField({ taskId: task.id, field: "title", value: title.trim() });
        if (description !== (task.description ?? "")) await updateTaskField({ taskId: task.id, field: "description", value: description || null });
        if (priority !== task.priority) await updateTaskField({ taskId: task.id, field: "priority", value: priority });
        if (!sameIdSet(assigneeIds, savedAssigneeIds)) {
          await setTaskAssignees(task.id, assigneeIds);
          setSavedAssigneeIds(assigneeIds);
        }
        if (projectId !== (task.project?.id ?? "")) await updateTaskField({ taskId: task.id, field: "projectId", value: projectId || null });
        const originalDue = task.dueAt ? toLocalInput(task.dueAt) : "";
        if (dueAt !== originalDue) await updateTaskField({ taskId: task.id, field: "dueAt", value: dueAt ? new Date(dueAt).toISOString() : null });
        if (status === "waiting") await updateTaskStatus({ taskId: task.id, status: "waiting", waitingOnName: waitingOnName || undefined, waitingOnOrg: waitingOnOrg || undefined, followupAt: followupAt ? new Date(followupAt).toISOString() : undefined });
        if (status === "blocked") await updateTaskStatus({ taskId: task.id, status: "blocked", blockedReason: blockedReason || undefined });
        flash("Changes saved");
      } catch {
        flash("Could not save changes");
      }
    });
  }

  function submitSubtask() {
    const clean = newSubtask.trim();
    if (!clean) return;
    setNewSubtask("");
    startTransition(async () => { await addSubtask(task.id, clean); });
  }

  function submitComment() {
    const clean = newComment.trim();
    if (!clean) return;
    setNewComment("");
    startTransition(async () => { await addComment(task.id, clean); });
  }

  function submitAttachment(event: FormEvent) {
    event.preventDefault();
    if (!linkName.trim() || !linkUrl.trim()) return;
    const name = linkName.trim();
    const url = linkUrl.trim();
    setLinkName("");
    setLinkUrl("");
    startTransition(async () => { await addAttachmentLink(task.id, name, url); });
  }

  function requestReview() {
    if (!reviewerIds.length) return;
    setStatus("needs_review");
    startTransition(async () => {
      try {
        await requestTaskReview(task.id, reviewerIds);
        setActiveReviewerIds(reviewerIds);
        flash("Review requested");
      } catch {
        flash("Could not request review");
      }
    });
  }

  const canResolveReview = status === "needs_review" && (activeReviewerIds.includes(currentUser.id) || currentUser.role === "admin");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-muted mb-2">{task.project?.name ?? "No project"}</div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="font-voice text-2xl sm:text-3xl font-semibold bg-transparent outline-none w-full border-b border-transparent focus:border-border pb-1" aria-label="Task title" />
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeToneClasses[tone]}`}>{label}</span>
            {priority === "urgent" && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brick-soft text-brick-text">Urgent</span>}
            {assigneeIds.length > 1 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent-text">{assigneeIds.length} assignees</span>}
            {isPending && <span className="text-xs text-text-muted">Saving</span>}
            {savedMessage && <span className="text-xs font-semibold text-sage-text">{savedMessage}</span>}
          </div>
        </div>
        <button onClick={saveCore} disabled={isPending} className="flex items-center justify-center gap-2 bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0"><Save size={15} />Save changes</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_310px] gap-5">
        <div className="space-y-5 min-w-0">
          <Section title="Description">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context, decisions, or the expected outcome" rows={6} className="w-full bg-page border border-border rounded-2xl px-4 py-3 text-sm leading-6 outline-none focus:border-accent resize-y" />
          </Section>

          {status === "waiting" && (
            <Section title="Waiting on">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Person"><input value={waitingOnName} onChange={(event) => setWaitingOnName(event.target.value)} placeholder="Name" className="field-input" /></Field>
                <Field label="Organization"><input value={waitingOnOrg} onChange={(event) => setWaitingOnOrg(event.target.value)} placeholder="Brand or organization" className="field-input" /></Field>
                <Field label="Follow-up"><input type="datetime-local" value={followupAt} onChange={(event) => setFollowupAt(event.target.value)} className="field-input" /></Field>
              </div>
            </Section>
          )}

          {status === "blocked" && (
            <Section title="Blocker">
              <textarea value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} placeholder="What is preventing this task from moving?" rows={3} className="w-full field-input resize-y" />
            </Section>
          )}

          <Section title="Subtasks" action={task.subtasks.length > 0 ? `${doneCount} of ${task.subtasks.length} complete` : undefined}>
            {task.subtasks.length > 0 && <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden mb-3"><div className="h-full bg-sage rounded-full" style={{ width: `${(doneCount / task.subtasks.length) * 100}%` }} /></div>}
            <div className="space-y-2 mb-3">
              {task.subtasks.map((subtask) => <SubtaskRow key={subtask.id} subtask={subtask} taskId={task.id} />)}
              {task.subtasks.length === 0 && <p className="text-sm text-text-muted">No subtasks yet.</p>}
            </div>
            <div className="flex gap-2"><input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitSubtask()} placeholder="Add a subtask and press Enter" className="field-input flex-1" /><button onClick={submitSubtask} className="text-sm font-semibold text-accent-text px-2">Add</button></div>
          </Section>

          <Section title="Discussion">
            <div className="space-y-4 mb-4">
              {task.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl bg-page p-3.5">
                  <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{comment.user.name}</span><span className="text-[11px] text-text-muted">{new Date(comment.createdAt).toLocaleString()}</span></div>
                  <p className="text-sm text-text-secondary mt-1 leading-5 whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
              {task.comments.length === 0 && <p className="text-sm text-text-muted">No comments yet.</p>}
            </div>
            <div className="flex gap-2"><input value={newComment} onChange={(event) => setNewComment(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitComment()} placeholder="Comment or mention @name" className="field-input flex-1" /><button onClick={submitComment} className="text-sm font-semibold text-accent-text px-2">Post</button></div>
          </Section>

          <Section title="Links and files">
            <div className="space-y-2 mb-4">
              {task.attachments.map((attachment) => (
                <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-border rounded-xl p-3 hover:border-border-strong">
                  <Link2 size={15} className="text-accent-text shrink-0" /><span className="text-sm font-medium flex-1 min-w-0 truncate">{attachment.name}</span><ExternalLink size={13} className="text-text-muted" />
                </a>
              ))}
              {task.attachments.length === 0 && <p className="text-sm text-text-muted">No links or files attached yet.</p>}
            </div>
            <form onSubmit={submitAttachment} className="grid sm:grid-cols-[1fr_1.5fr_auto] gap-2">
              <input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Link name" className="field-input" />
              <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" className="field-input" />
              <button className="border border-border rounded-xl px-3 py-2 text-sm font-semibold">Attach</button>
            </form>
          </Section>

          <Section title="Activity">
            <button onClick={() => setShowActivity((value) => !value)} className="text-sm font-semibold text-text-secondary">{showActivity ? "Hide" : "Show"} activity history ({task.activity.length})</button>
            {showActivity && <div className="space-y-2 mt-4">{task.activity.map((activity) => <div key={activity.id} className="text-xs text-text-muted"><span className="font-semibold text-text-secondary">{activity.user.name}</span> {describeActivity(activity)} · {new Date(activity.createdAt).toLocaleString()}</div>)}</div>}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <section className="border border-border bg-surface p-4 rounded-2xl space-y-4">
            <Property label="Status"><select value={status} onChange={(event) => changeStatus(event.target.value)} className="property-select">{STATUS_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Property>
            <Property label="Priority"><select value={priority} onChange={(event) => setPriority(event.target.value)} className="property-select"><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Property>
            <Property label="Assignees">
              <MultiPersonPicker people={people} selectedIds={assigneeIds} onChange={setAssigneeIds} emptyLabel="Unassigned" />
            </Property>
            <Property label="Project"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="property-select"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Property>
            <Property label="Due"><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="property-select" /></Property>
          </section>

          <section className="border border-border bg-surface p-4 rounded-2xl">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold text-text-muted mb-3">Reviewers</div>
            <MultiPersonPicker people={people} selectedIds={reviewerIds} onChange={setReviewerIds} emptyLabel="Choose reviewers" />
            <button onClick={requestReview} disabled={!reviewerIds.length || isPending} className="w-full border border-border rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 mt-2">Request review</button>
            {activeReviewerIds.length > 1 && status === "needs_review" && <div className="text-[10px] text-text-muted mt-2">Any selected reviewer can approve or request changes.</div>}
            {canResolveReview && <div className="grid grid-cols-2 gap-2 mt-2"><button onClick={() => startTransition(async () => { await resolveTaskReview(task.id, "approve"); setStatus("completed"); })} className="bg-sage-soft text-sage-text rounded-xl px-2 py-2 text-xs font-semibold">Approve</button><button onClick={() => startTransition(async () => { await resolveTaskReview(task.id, "changes"); setStatus("in_progress"); })} className="bg-gold-soft text-gold-text rounded-xl px-2 py-2 text-xs font-semibold">Request changes</button></div>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="border border-border bg-surface p-4 sm:p-5 rounded-2xl"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-voice text-lg font-semibold">{title}</h2>{action && <span className="text-xs text-text-muted">{action}</span>}</div>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] uppercase tracking-[0.09em] text-text-muted font-semibold block mb-1.5">{label}</span>{children}</label>;
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="block"><span className="text-[10px] uppercase tracking-[0.09em] text-text-muted font-semibold block mb-1.5">{label}</span>{children}</div>;
}

function MultiPersonPicker({
  people,
  selectedIds,
  onChange,
  emptyLabel,
}: {
  people: Person[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel: string;
}) {
  function toggle(personId: string) {
    onChange(
      selectedIds.includes(personId)
        ? selectedIds.filter((id) => id !== personId)
        : [...selectedIds, personId]
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border bg-page text-xs text-text-muted">
        <UsersRound size={13} />
        <span>{selectedIds.length ? `${selectedIds.length} selected` : emptyLabel}</span>
      </div>
      <div className="max-h-36 overflow-y-auto p-1">
        {people.map((person) => (
          <label key={person.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:bg-page">
            <input
              type="checkbox"
              checked={selectedIds.includes(person.id)}
              onChange={() => toggle(person.id)}
              className="h-3.5 w-3.5 rounded border-border accent-accent"
            />
            <span className="truncate">{person.name}</span>
          </label>
        ))}
        {people.length === 0 && <div className="px-2 py-2 text-xs text-text-muted">No active teammates.</div>}
      </div>
    </div>
  );
}

function describeActivity(activity: Activity) {
  if (activity.action === "created") return "created this task";
  if (activity.action === "status_changed") return `changed status from ${humanize(activity.oldValue ?? "")} to ${humanize(activity.newValue ?? "")}`;
  if (activity.action === "commented") return "added a comment";
  if (activity.action === "subtask_added") return `added subtask “${activity.newValue ?? ""}”`;
  if (activity.action === "subtask_completed") return "completed a subtask";
  if (activity.action === "review_requested") return "requested a review";
  if (activity.action === "review_approved") return "approved the review";
  if (activity.action === "changes_requested") return "requested changes";
  if (activity.action === "assignees_changed") return "updated the assignees";
  return humanize(activity.action).toLowerCase();
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toLocalInput(value: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function sameIdSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function SubtaskRow({ subtask, taskId }: { subtask: Subtask; taskId: string }) {
  const [complete, setComplete] = useState(subtask.completed);
  const [isPending, startTransition] = useTransition();
  function toggle() {
    const next = !complete;
    setComplete(next);
    startTransition(async () => {
      try { await toggleSubtask(subtask.id, taskId, next); }
      catch { setComplete(!next); }
    });
  }
  return <button onClick={toggle} disabled={isPending} className="w-full flex items-center gap-2.5 text-left rounded-xl px-2 py-1.5 hover:bg-page">{complete ? <CheckCircle2 size={17} className="text-sage shrink-0" /> : <Circle size={17} className="text-border-strong shrink-0" />}<span className={`text-sm ${complete ? "line-through text-text-muted" : ""}`}>{subtask.title}</span></button>;
}
