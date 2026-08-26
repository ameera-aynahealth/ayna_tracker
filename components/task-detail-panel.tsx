"use client";

import { useState, useTransition } from "react";
import { formatDueBadge } from "@/lib/format";
import { updateTaskStatus, addSubtask, toggleSubtask, addComment } from "@/lib/actions/tasks";
import { CheckCircle2, Circle } from "lucide-react";

type Subtask = { id: string; title: string; completed: boolean };
type Comment = { id: string; body: string; createdAt: Date; user: { name: string } };
type Activity = { id: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; createdAt: Date; user: { name: string } };

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  waitingOnName: string | null;
  waitingOnOrg: string | null;
  blockedReason: string | null;
  project: { name: string } | null;
  owner: { name: string } | null;
  subtasks: Subtask[];
  comments: Comment[];
  activity: Activity[];
};

const STATUS_OPTIONS = [
  "backlog", "not_started", "in_progress", "waiting", "blocked", "needs_review", "completed", "cancelled",
];

const badgeToneClasses: Record<string, string> = {
  brick: "bg-brick-soft text-brick-text",
  gold: "bg-gold-soft text-gold-text",
  accent: "bg-accent-soft text-accent-text",
  plum: "bg-plum-soft text-plum-text",
  sage: "bg-sage-soft text-sage-text",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function TaskDetailPanel({ task, currentUser }: { task: TaskDetail; currentUser: { id: string } }) {
  const [isPending, startTransition] = useTransition();
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showActivity, setShowActivity] = useState(false);

  const { label, tone } = formatDueBadge(task.dueAt, task.status);
  const doneCount = task.subtasks.filter((s) => s.completed).length;

  function changeStatus(status: string) {
    startTransition(async () => {
      await updateTaskStatus({ taskId: task.id, status: status as never });
    });
  }

  function submitSubtask() {
    if (!newSubtask.trim()) return;
    startTransition(async () => {
      await addSubtask(task.id, newSubtask.trim());
      setNewSubtask("");
    });
  }

  function submitComment() {
    if (!newComment.trim()) return;
    startTransition(async () => {
      await addComment(task.id, newComment.trim());
      setNewComment("");
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="text-xs text-text-muted mb-2">{task.project?.name ?? "No project"}</div>
      <h1 className="font-voice text-2xl font-semibold mb-4">{task.title}</h1>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <select
          value={task.status}
          onChange={(e) => changeStatus(e.target.value)}
          disabled={isPending}
          className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeToneClasses[tone]}`}>{label}</span>
        {task.owner && <span className="text-xs text-text-muted">Owner: {task.owner.name}</span>}
      </div>

      {task.status === "waiting" && (task.waitingOnName || task.waitingOnOrg) && (
        <div className="bg-plum-soft rounded-lg px-3 py-2 mb-4 text-sm">
          <span className="text-plum-text font-semibold">Waiting on: </span>
          {task.waitingOnName}{task.waitingOnOrg ? `, ${task.waitingOnOrg}` : ""}
        </div>
      )}
      {task.status === "blocked" && task.blockedReason && (
        <div className="bg-plum-soft rounded-lg px-3 py-2 mb-4 text-sm">
          <span className="text-plum-text font-semibold">Blocked: </span>
          {task.blockedReason}
        </div>
      )}

      {task.description && <p className="text-sm text-text-secondary leading-relaxed mb-6">{task.description}</p>}

      {/* Subtasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Subtasks</h3>
          {task.subtasks.length > 0 && (
            <span className="text-xs text-text-muted">{doneCount} of {task.subtasks.length} complete</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mb-2">
          {task.subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} taskId={task.id} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSubtask()}
            placeholder="Add a subtask"
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 flex-1 bg-surface"
          />
          <button onClick={submitSubtask} className="text-sm text-accent-text font-medium">Add</button>
        </div>
      </div>

      {/* Comments */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Comments</h3>
        <div className="flex flex-col gap-3 mb-3">
          {task.comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.user.name}</span>{" "}
              <span className="text-text-muted text-xs">{new Date(c.createdAt).toLocaleString()}</span>
              <p className="text-text-secondary">{c.body}</p>
            </div>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-text-muted">No comments yet.</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder="Add a comment"
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 flex-1 bg-surface"
          />
          <button onClick={submitComment} className="text-sm text-accent-text font-medium">Post</button>
        </div>
      </div>

      {/* Activity */}
      <div>
        <button onClick={() => setShowActivity((v) => !v)} className="text-sm font-semibold text-text-secondary">
          {showActivity ? "Hide" : "Show"} activity ({task.activity.length})
        </button>
        {showActivity && (
          <div className="flex flex-col gap-1.5 mt-2">
            {task.activity.map((a) => (
              <div key={a.id} className="text-xs text-text-muted">
                {a.user.name} {describeActivity(a)} &middot; {new Date(a.createdAt).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function describeActivity(a: Activity) {
  if (a.action === "created") return "created this task";
  if (a.action === "status_changed") return `changed status from ${statusLabel(a.oldValue ?? "")} to ${statusLabel(a.newValue ?? "")}`;
  if (a.action === "commented") return "added a comment";
  if (a.action === "subtask_added") return `added subtask "${a.newValue}"`;
  if (a.action === "subtask_completed") return "completed a subtask";
  return a.action.replace(/_/g, " ");
}

function SubtaskRow({ subtask, taskId }: { subtask: Subtask; taskId: string }) {
  const [isPending, startTransition] = useTransition();
  function toggle() {
    startTransition(async () => {
      await toggleSubtask(subtask.id, taskId, !subtask.completed);
    });
  }
  return (
    <button onClick={toggle} disabled={isPending} className="flex items-center gap-2 text-left">
      {subtask.completed ? <CheckCircle2 size={16} className="text-sage" /> : <Circle size={16} className="text-border-strong" />}
      <span className={`text-sm ${subtask.completed ? "line-through text-text-muted" : ""}`}>{subtask.title}</span>
    </button>
  );
}
