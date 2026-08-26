"use server";

import { db } from "@/db";
import { attachments, comments, notifications, subtasks, tasks, users } from "@/db/schema";
import { requireEditPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
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
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createTaskQuick(input: z.input<typeof createTaskSchema>) {
  const user = await requireEditPermission();
  const parsed = createTaskSchema.parse(input);
  const id = nanoid();
  const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : undefined;

  await db.insert(tasks).values({
    id,
    workspaceId: user.workspaceId,
    projectId: parsed.projectId,
    workstreamId: parsed.workstreamId,
    title: parsed.title,
    ownerId: parsed.ownerId,
    createdById: user.id,
    priority: parsed.priority,
    status: parsed.status,
    dueAt,
    originalDueAt: dueAt,
  });

  await logActivity({ taskId: id, userId: user.id, action: "created", newValue: parsed.title });

  if (parsed.ownerId && parsed.ownerId !== user.id) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: parsed.ownerId,
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
    ownerId: parsed.ownerId ?? null,
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

  if (parsed.status === "blocked" && existing.ownerId && existing.ownerId !== user.id) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: existing.ownerId,
      taskId: existing.id,
      type: "blocked",
      title: `Task blocked: ${existing.title}`,
      body: parsed.blockedReason ?? existing.blockedReason ?? undefined,
    });
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

  if (task.ownerId && task.ownerId !== user.id && !mentioned.some((m) => m.id === task.ownerId)) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: task.ownerId,
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

export async function requestTaskReview(taskId: string, reviewerId: string) {
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");

  await db.update(tasks).set({
    reviewerId,
    reviewRequired: true,
    status: "needs_review",
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "review_requested", newValue: reviewerId });
  await db.insert(notifications).values({
    id: nanoid(), userId: reviewerId, taskId, type: "review_requested", title: `Review requested: ${task.title}`,
  });
  revalidateTaskSurfaces(task.projectId);
}

export async function resolveTaskReview(taskId: string, decision: "approve" | "changes") {
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");
  if (task.reviewerId && task.reviewerId !== user.id && user.role !== "admin") throw new Error("Only the reviewer or an admin can resolve this review");

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

  if (task.ownerId && task.ownerId !== user.id) {
    await db.insert(notifications).values({
      id: nanoid(), userId: task.ownerId, taskId, type: "project_update",
      title: approved ? `Review approved: ${task.title}` : `Changes requested: ${task.title}`,
    });
  }
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
