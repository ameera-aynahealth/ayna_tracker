"use server";

import { db } from "@/db";
import {
  attachments,
  comments,
  notifications,
  subtasks,
  taskCollaborators,
  taskReviewers,
  tasks,
  users,
} from "@/db/schema";
import { requireEditPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ensureTaskPeopleSchema } from "@/lib/ensure-task-people";
import { nanoid } from "nanoid";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const statusSchema = z.enum([
  "backlog",
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
  "needs_review",
  "completed",
  "cancelled",
]);

const prioritySchema = z.enum(["urgent", "high", "medium", "low"]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  projectId: z.string().optional(),
  workstreamId: z.string().optional(),
  ownerId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueAt: z.string().optional(),
  priority: prioritySchema.default("medium"),
  status: statusSchema.default("not_started"),
});

function revalidateTaskSurfaces(projectId?: string | null) {
  revalidatePath("/");
  revalidatePath("/my-work");
  revalidatePath("/tasks");
  revalidatePath("/board");
  revalidatePath("/calendar");
  revalidatePath("/analytics");
  revalidatePath("/inbox");
  revalidatePath("/team");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function validateActiveWorkspaceUsers(workspaceId: string, ids: string[]) {
  const requested = uniqueIds(ids);
  if (!requested.length) return [];
  const rows = await db.query.users.findMany({
    where: and(
      eq(users.workspaceId, workspaceId),
      eq(users.active, true),
      inArray(users.id, requested)
    ),
  });
  if (rows.length !== requested.length) throw new Error("One or more selected teammates are no longer active");
  return requested;
}

async function getTaskAssigneeIds(taskId: string, ownerId: string | null) {
  const rows = await db.select({ userId: taskCollaborators.userId })
    .from(taskCollaborators)
    .where(eq(taskCollaborators.taskId, taskId));
  return uniqueIds([ownerId, ...rows.map((row) => row.userId)]);
}

export async function createTaskQuick(input: z.input<typeof createTaskSchema>) {
  const user = await requireEditPermission();
  const parsed = createTaskSchema.parse(input);
  const id = nanoid();
  const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : undefined;
  const requestedAssignees = parsed.assigneeIds?.length
    ? parsed.assigneeIds
    : parsed.ownerId
      ? [parsed.ownerId]
      : [];
  const assigneeIds = await validateActiveWorkspaceUsers(user.workspaceId, requestedAssignees);
  const primaryOwnerId = assigneeIds[0];

  await db.transaction(async (tx) => {
    await tx.insert(tasks).values({
      id,
      workspaceId: user.workspaceId,
      projectId: parsed.projectId,
      workstreamId: parsed.workstreamId,
      title: parsed.title,
      ownerId: primaryOwnerId,
      createdById: user.id,
      priority: parsed.priority,
      status: parsed.status,
      dueAt,
      originalDueAt: dueAt,
    });

    const additionalAssignees = assigneeIds.slice(1);
    if (additionalAssignees.length) {
      await tx.insert(taskCollaborators).values(
        additionalAssignees.map((userId) => ({ taskId: id, userId }))
      ).onConflictDoNothing();
    }
  });

  await logActivity({ taskId: id, userId: user.id, action: "created", newValue: parsed.title });

  for (const assigneeId of assigneeIds) {
    if (assigneeId === user.id) continue;
    await db.insert(notifications).values({
      id: nanoid(),
      userId: assigneeId,
      taskId: id,
      type: "assigned",
      title: `New task assigned: ${parsed.title}`,
      body: parsed.projectId ? "Open the task to review its project and deadline." : "Open the task to review the details.",
    });
  }

  revalidateTaskSurfaces(parsed.projectId);
  return {
    id,
    title: parsed.title,
    projectId: parsed.projectId ?? null,
    workstreamId: parsed.workstreamId ?? null,
    ownerId: primaryOwnerId ?? null,
    assigneeIds,
    dueAt: dueAt?.toISOString() ?? null,
    priority: parsed.priority,
    status: parsed.status,
  };
}

const updateStatusSchema = z.object({
  taskId: z.string(),
  status: statusSchema,
  waitingOnName: z.string().optional(),
  waitingOnOrg: z.string().optional(),
  followupAt: z.string().optional(),
  blockedReason: z.string().optional(),
});

export async function updateTaskStatus(input: z.infer<typeof updateStatusSchema>) {
  const user = await requireEditPermission();
  const parsed = updateStatusSchema.parse(input);
  const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, parsed.taskId) });
  if (!existing) throw new Error("Task not found");

  const patch: Partial<typeof tasks.$inferInsert> = {
    status: parsed.status,
    lastActivityAt: new Date(),
    updatedAt: new Date(),
  };

  if (parsed.status === "completed") {
    patch.completedAt = new Date();
    patch.completedById = user.id;
    patch.cancelledAt = null;
  } else {
    patch.completedAt = null;
    patch.completedById = null;
  }

  if (parsed.status === "cancelled") patch.cancelledAt = new Date();
  else if (existing.status === "cancelled") patch.cancelledAt = null;

  if (parsed.status === "waiting") {
    patch.waitingOnName = parsed.waitingOnName ?? existing.waitingOnName;
    patch.waitingOnOrg = parsed.waitingOnOrg ?? existing.waitingOnOrg;
    patch.waitingSince = existing.waitingSince ?? new Date();
    patch.followupAt = parsed.followupAt ? new Date(parsed.followupAt) : existing.followupAt;
  } else if (existing.status === "waiting") {
    patch.waitingOnName = null;
    patch.waitingOnOrg = null;
    patch.waitingSince = null;
    patch.followupAt = null;
    patch.waitingNotes = null;
  }

  if (parsed.status === "blocked") {
    patch.blockedReason = parsed.blockedReason ?? existing.blockedReason ?? "Needs a blocker reason";
    patch.blockedSince = existing.blockedSince ?? new Date();
  } else if (existing.status === "blocked") {
    patch.blockedReason = null;
    patch.blockedSince = null;
    patch.nextCheckInAt = null;
  }

  await db.update(tasks).set(patch).where(eq(tasks.id, parsed.taskId));
  await logActivity({
    taskId: parsed.taskId,
    userId: user.id,
    action: "status_changed",
    field: "status",
    oldValue: existing.status,
    newValue: parsed.status,
  });

  if (parsed.status === "blocked") {
    const assigneeIds = await getTaskAssigneeIds(existing.id, existing.ownerId);
    for (const assigneeId of assigneeIds) {
      if (assigneeId === user.id) continue;
      await db.insert(notifications).values({
        id: nanoid(),
        userId: assigneeId,
        taskId: existing.id,
        type: "blocked",
        title: `Task blocked: ${existing.title}`,
        body: parsed.blockedReason ?? existing.blockedReason ?? undefined,
      });
    }
  }

  revalidateTaskSurfaces(existing.projectId);
}

type EditableField =
  | "priority"
  | "dueAt"
  | "ownerId"
  | "projectId"
  | "workstreamId"
  | "reviewerId"
  | "title"
  | "description";

export async function updateTaskField(input: {
  taskId: string;
  field: EditableField;
  value: string | null;
}) {
  const user = await requireEditPermission();
  const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!existing) throw new Error("Task not found");

  if (input.field === "priority" && input.value) prioritySchema.parse(input.value);
  if (input.field === "title" && (!input.value || !input.value.trim())) throw new Error("Title cannot be empty");

  const patch: Record<string, unknown> = { updatedAt: new Date(), lastActivityAt: new Date() };
  if (input.field === "dueAt") {
    patch.dueAt = input.value ? new Date(input.value) : null;
    if (!existing.originalDueAt && input.value) patch.originalDueAt = new Date(input.value);
  } else {
    patch[input.field] = input.value;
  }

  await db.update(tasks).set(patch).where(eq(tasks.id, input.taskId));
  await logActivity({
    taskId: input.taskId,
    userId: user.id,
    action: `${input.field}_changed`,
    field: input.field,
    oldValue: String((existing as Record<string, unknown>)[input.field] ?? ""),
    newValue: input.value ?? "",
  });

  if (input.field === "ownerId" && input.value && input.value !== existing.ownerId) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: input.value,
      taskId: existing.id,
      type: "assigned",
      title: `Task assigned to you: ${existing.title}`,
    });
  }

  revalidateTaskSurfaces(input.field === "projectId" ? input.value : existing.projectId);
  if (input.field === "projectId" && existing.projectId && existing.projectId !== input.value) {
    revalidatePath(`/projects/${existing.projectId}`);
  }
}

export async function setTaskAssignees(taskId: string, requestedIds: string[]) {
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");

  const assigneeIds = await validateActiveWorkspaceUsers(user.workspaceId, requestedIds);
  const previousIds = await getTaskAssigneeIds(taskId, task.ownerId);
  const primaryOwnerId = task.ownerId && assigneeIds.includes(task.ownerId)
    ? task.ownerId
    : assigneeIds[0] ?? null;
  const additionalIds = assigneeIds.filter((id) => id !== primaryOwnerId);

  await db.transaction(async (tx) => {
    await tx.update(tasks).set({
      ownerId: primaryOwnerId,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    }).where(eq(tasks.id, taskId));
    await tx.delete(taskCollaborators).where(eq(taskCollaborators.taskId, taskId));
    if (additionalIds.length) {
      await tx.insert(taskCollaborators).values(
        additionalIds.map((userId) => ({ taskId, userId }))
      ).onConflictDoNothing();
    }
  });

  await logActivity({
    taskId,
    userId: user.id,
    action: "assignees_changed",
    field: "assignees",
    oldValue: previousIds.join(","),
    newValue: assigneeIds.join(","),
  });

  for (const assigneeId of assigneeIds) {
    if (assigneeId === user.id || previousIds.includes(assigneeId)) continue;
    await db.insert(notifications).values({
      id: nanoid(),
      userId: assigneeId,
      taskId,
      type: "assigned",
      title: `Task assigned to you: ${task.title}`,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces(task.projectId);
}

export async function bulkUpdateTasks(input: {
  taskIds: string[];
  status?: z.infer<typeof statusSchema>;
  priority?: z.infer<typeof prioritySchema>;
  ownerId?: string | null;
  dueAt?: string | null;
}) {
  const user = await requireEditPermission();
  if (!input.taskIds.length) return;
  if (input.status) statusSchema.parse(input.status);
  if (input.priority) prioritySchema.parse(input.priority);

  const patch: Record<string, unknown> = { updatedAt: new Date(), lastActivityAt: new Date() };
  if (input.status) {
    patch.status = input.status;
    if (input.status === "completed") {
      patch.completedAt = new Date();
      patch.completedById = user.id;
    }
  }
  if (input.priority) patch.priority = input.priority;
  if (input.ownerId !== undefined) patch.ownerId = input.ownerId;
  if (input.dueAt !== undefined) patch.dueAt = input.dueAt ? new Date(input.dueAt) : null;

  await db.update(tasks).set(patch).where(inArray(tasks.id, input.taskIds));
  for (const taskId of input.taskIds) {
    await logActivity({ taskId, userId: user.id, action: "bulk_updated" });
  }
  revalidateTaskSurfaces();
}

export async function archiveTask(taskId: string) {
  const user = await requireEditPermission();
  const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!existing) throw new Error("Task not found");
  await db.update(tasks).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "archived" });
  revalidateTaskSurfaces(existing.projectId);
}

// ---- Subtasks -------------------------------------------------------------

export async function addSubtask(taskId: string, title: string) {
  const user = await requireEditPermission();
  if (!title.trim()) throw new Error("Subtask title is required");
  const existingCount = await db.query.subtasks.findMany({ where: eq(subtasks.taskId, taskId) });
  const id = nanoid();
  await db.insert(subtasks).values({ id, taskId, title: title.trim(), sortOrder: existingCount.length });
  await db.update(tasks).set({ lastActivityAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "subtask_added", newValue: title.trim() });
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces();
}

export async function toggleSubtask(subtaskId: string, taskId: string, completed: boolean) {
  const user = await requireEditPermission();
  await db.update(subtasks).set({ completed }).where(eq(subtasks.id, subtaskId));
  await db.update(tasks).set({ lastActivityAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: completed ? "subtask_completed" : "subtask_reopened" });
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces();
}

// ---- Comments and mentions -----------------------------------------------

export async function addComment(taskId: string, body: string) {
  const user = await requireEditPermission();
  const clean = body.trim();
  if (!clean) throw new Error("Comment cannot be empty");

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");

  await db.insert(comments).values({ id: nanoid(), taskId, userId: user.id, body: clean });
  await db.update(tasks).set({ lastActivityAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "commented" });

  const members = await db.query.users.findMany({ where: eq(users.active, true) });
  const lowerBody = clean.toLowerCase();
  const mentioned = members.filter((member) => {
    if (member.id === user.id) return false;
    const first = member.name.split(" ")[0]?.toLowerCase();
    const full = member.name.toLowerCase();
    return Boolean(first && lowerBody.includes(`@${first}`)) || lowerBody.includes(`@${full}`);
  });

  for (const member of mentioned) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: member.id,
      taskId,
      type: "mentioned",
      title: `${user.name} mentioned you in ${task.title}`,
      body: clean.slice(0, 240),
    });
  }

  const assigneeIds = await getTaskAssigneeIds(taskId, task.ownerId);
  for (const assigneeId of assigneeIds) {
    if (assigneeId === user.id || mentioned.some((member) => member.id === assigneeId)) continue;
    await db.insert(notifications).values({
      id: nanoid(),
      userId: assigneeId,
      taskId,
      type: "comment",
      title: `${user.name} commented on ${task.title}`,
      body: clean.slice(0, 240),
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces(task.projectId);
}

// ---- Review workflow ------------------------------------------------------

export async function requestTaskReview(taskId: string, reviewerIdsInput: string[] | string) {
  const user = await requireEditPermission();
  await ensureTaskPeopleSchema();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");

  const requestedIds = Array.isArray(reviewerIdsInput) ? reviewerIdsInput : [reviewerIdsInput];
  const reviewerIds = await validateActiveWorkspaceUsers(user.workspaceId, requestedIds);
  if (!reviewerIds.length) throw new Error("Choose at least one reviewer");

  await db.transaction(async (tx) => {
    await tx.update(tasks).set({
      reviewerId: reviewerIds[0],
      reviewRequired: true,
      status: "needs_review",
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    }).where(eq(tasks.id, taskId));
    await tx.delete(taskReviewers).where(eq(taskReviewers.taskId, taskId));
    await tx.insert(taskReviewers).values(
      reviewerIds.map((userId) => ({ taskId, userId }))
    ).onConflictDoNothing();
  });

  await logActivity({ taskId, userId: user.id, action: "review_requested", newValue: reviewerIds.join(",") });
  for (const reviewerId of reviewerIds) {
    if (reviewerId === user.id) continue;
    await db.insert(notifications).values({
      id: nanoid(),
      userId: reviewerId,
      taskId,
      type: "review_requested",
      title: `Review requested: ${task.title}`,
    });
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces(task.projectId);
}

export async function resolveTaskReview(taskId: string, decision: "approve" | "changes") {
  const user = await requireEditPermission();
  await ensureTaskPeopleSchema();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");

  const reviewerRows = await db.select({ userId: taskReviewers.userId })
    .from(taskReviewers)
    .where(eq(taskReviewers.taskId, taskId));
  const allowedReviewerIds = uniqueIds([task.reviewerId, ...reviewerRows.map((row) => row.userId)]);
  if (!allowedReviewerIds.includes(user.id) && user.role !== "admin") {
    throw new Error("Only a selected reviewer or an admin can resolve this review");
  }

  const approved = decision === "approve";
  await db.update(tasks).set({
    status: approved ? "completed" : "in_progress",
    reviewRequired: false,
    completedAt: approved ? new Date() : null,
    completedById: approved ? user.id : null,
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: approved ? "review_approved" : "changes_requested" });

  const assigneeIds = await getTaskAssigneeIds(taskId, task.ownerId);
  for (const assigneeId of assigneeIds) {
    if (assigneeId === user.id) continue;
    await db.insert(notifications).values({
      id: nanoid(),
      userId: assigneeId,
      taskId,
      type: "project_update",
      title: approved ? `Review approved: ${task.title}` : `Changes requested: ${task.title}`,
    });
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskSurfaces(task.projectId);
}

// ---- Attachments ----------------------------------------------------------

export async function addAttachmentLink(taskId: string, name: string, url: string) {
  const user = await requireEditPermission();
  const parsedUrl = z.string().url().parse(url);
  if (!name.trim()) throw new Error("Link name is required");
  await db.insert(attachments).values({
    id: nanoid(), taskId, uploadedById: user.id, kind: "link", name: name.trim(), url: parsedUrl,
  });
  await logActivity({ taskId, userId: user.id, action: "attachment_added", newValue: name.trim() });
  revalidatePath(`/tasks/${taskId}`);
}
