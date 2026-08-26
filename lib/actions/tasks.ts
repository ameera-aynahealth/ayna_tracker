"use server";

import { db } from "@/db";
import { tasks, subtasks, comments } from "@/db/schema";
import { requireEditPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.string().optional(),
  ownerId: z.string().optional(),
  dueAt: z.string().optional(), // ISO string
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
});

// Inline Quick Add (spec section 99–102): only title is required, everything
// else has a sensible default and can be filled in later from the panel.
export async function createTaskQuick(input: z.infer<typeof createTaskSchema>) {
  const user = await requireEditPermission();
  const parsed = createTaskSchema.parse(input);

  const workspaceId = user.workspaceId;
  const id = nanoid();

  await db.insert(tasks).values({
    id,
    workspaceId,
    projectId: parsed.projectId,
    title: parsed.title,
    ownerId: parsed.ownerId,
    createdById: user.id,
    priority: parsed.priority,
    dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
    originalDueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
    status: "not_started",
  });

  await logActivity({ taskId: id, userId: user.id, action: "created", newValue: parsed.title });

  revalidatePath("/");
  revalidatePath("/my-work");
  revalidatePath("/tasks");
  return id;
}

const updateStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum([
    "backlog", "not_started", "in_progress", "waiting", "blocked",
    "needs_review", "completed", "cancelled",
  ]),
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

  const patch: Partial<typeof tasks.$inferInsert> = { status: parsed.status, lastActivityAt: new Date() };

  if (parsed.status === "completed") {
    patch.completedAt = new Date();
    patch.completedById = user.id;
  } else {
    patch.completedAt = null;
    patch.completedById = null;
  }
  if (parsed.status === "cancelled") {
    patch.cancelledAt = new Date();
  } else {
    patch.cancelledAt = null;
  }
  if (parsed.status === "waiting") {
    patch.waitingOnName = parsed.waitingOnName;
    patch.waitingOnOrg = parsed.waitingOnOrg;
    patch.waitingSince = existing.waitingSince ?? new Date();
    patch.followupAt = parsed.followupAt ? new Date(parsed.followupAt) : undefined;
  }
  if (parsed.status === "blocked") {
    patch.blockedReason = parsed.blockedReason;
    patch.blockedSince = existing.blockedSince ?? new Date();
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

  revalidatePath("/");
  revalidatePath("/my-work");
  revalidatePath("/tasks");
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`);
}

export async function updateTaskField(input: {
  taskId: string;
  field: "priority" | "dueAt" | "ownerId" | "title" | "description";
  value: string | null;
}) {
  const user = await requireEditPermission();
  const existing = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!existing) throw new Error("Task not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  let newValueForLog = input.value;

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
    newValue: newValueForLog ?? "",
  });

  revalidatePath("/");
  revalidatePath("/my-work");
  revalidatePath("/tasks");
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`);
}

// ---- Subtasks -----------------------------------------------------------

export async function addSubtask(taskId: string, title: string) {
  const user = await requireEditPermission();
  const existingCount = await db.query.subtasks.findMany({ where: eq(subtasks.taskId, taskId) });
  const id = nanoid();
  await db.insert(subtasks).values({ id, taskId, title, sortOrder: existingCount.length });
  await logActivity({ taskId, userId: user.id, action: "subtask_added", newValue: title });
  revalidatePath("/");
}

export async function toggleSubtask(subtaskId: string, taskId: string, completed: boolean) {
  const user = await requireEditPermission();
  await db.update(subtasks).set({ completed }).where(eq(subtasks.id, subtaskId));
  await logActivity({
    taskId,
    userId: user.id,
    action: completed ? "subtask_completed" : "subtask_reopened",
  });
  revalidatePath("/");
}

// ---- Comments -------------------------------------------------------------

export async function addComment(taskId: string, body: string) {
  const user = await requireEditPermission();
  if (!body.trim()) throw new Error("Comment cannot be empty");
  const id = nanoid();
  await db.insert(comments).values({ id, taskId, userId: user.id, body });
  await logActivity({ taskId, userId: user.id, action: "commented" });
  revalidatePath("/");
}
