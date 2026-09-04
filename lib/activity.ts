import { db } from "@/db";
import { activityLogs, taskCollaborators, tasks, users } from "@/db/schema";
import { sendTaskActionEmail } from "@/lib/task-action-emails";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

function parseIds(value?: string | null) {
  return [...new Set((value ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
}

async function sendActivityEmail(entry: {
  taskId?: string;
  userId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  if (!entry.taskId) return;

  try {
    const [task, actor] = await Promise.all([
      db.query.tasks.findFirst({ where: eq(tasks.id, entry.taskId) }),
      db.query.users.findFirst({ where: eq(users.id, entry.userId) }),
    ]);
    if (!task || !actor) return;

    const taskInfo = {
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      priority: task.priority,
    };

    if (entry.action === "created") {
      const collaboratorRows = await db.select({ userId: taskCollaborators.userId })
        .from(taskCollaborators)
        .where(eq(taskCollaborators.taskId, task.id));
      const assigneeIds = [...new Set([task.ownerId, ...collaboratorRows.map((row) => row.userId)].filter((id): id is string => Boolean(id)))];
      await Promise.all(assigneeIds
        .filter((recipientId) => recipientId !== actor.id)
        .map((recipientId) => sendTaskActionEmail({
          kind: "assigned",
          recipientId,
          actorName: actor.name,
          task: taskInfo,
        })));
      return;
    }

    if (entry.action === "assignees_changed") {
      const previous = new Set(parseIds(entry.oldValue));
      const added = parseIds(entry.newValue).filter((id) => !previous.has(id) && id !== actor.id);
      await Promise.all(added.map((recipientId) => sendTaskActionEmail({
        kind: "assigned",
        recipientId,
        actorName: actor.name,
        task: taskInfo,
      })));
      return;
    }

    if (entry.action === "ownerId_changed" && entry.newValue && entry.newValue !== actor.id) {
      await sendTaskActionEmail({
        kind: "reassigned",
        recipientId: entry.newValue,
        actorName: actor.name,
        task: taskInfo,
      });
      return;
    }

    if (entry.action === "reviewerId_changed" && entry.newValue && entry.newValue !== actor.id) {
      await sendTaskActionEmail({
        kind: "assigned_review",
        recipientId: entry.newValue,
        actorName: actor.name,
        task: taskInfo,
      });
      return;
    }

    if (entry.action === "review_requested") {
      const reviewerIds = parseIds(entry.newValue).filter((id) => id !== actor.id);
      await Promise.all(reviewerIds.map((recipientId) => sendTaskActionEmail({
        kind: "ready_review",
        recipientId,
        actorName: actor.name,
        task: taskInfo,
      })));
      return;
    }

    if (entry.action === "review_approved" || entry.action === "changes_requested") {
      const collaboratorRows = await db.select({ userId: taskCollaborators.userId })
        .from(taskCollaborators)
        .where(eq(taskCollaborators.taskId, task.id));
      const assigneeIds = [...new Set([task.ownerId, ...collaboratorRows.map((row) => row.userId)].filter((id): id is string => Boolean(id)))];
      await Promise.all(assigneeIds
        .filter((recipientId) => recipientId !== actor.id)
        .map((recipientId) => sendTaskActionEmail({
          kind: entry.action === "review_approved" ? "approved" : "changes_requested",
          recipientId,
          actorName: actor.name,
          task: taskInfo,
        })));
    }
  } catch (error) {
    console.error("[activity-email]", entry.action, entry.taskId, error instanceof Error ? error.message : error);
  }
}

export async function logActivity(entry: {
  taskId?: string;
  projectId?: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await db.insert(activityLogs).values({
    id: nanoid(),
    taskId: entry.taskId,
    projectId: entry.projectId,
    userId: entry.userId,
    action: entry.action,
    field: entry.field,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
  });

  await sendActivityEmail(entry);
}
