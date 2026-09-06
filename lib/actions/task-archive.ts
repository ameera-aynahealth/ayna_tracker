"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireEditPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

function refreshTaskViews(taskId: string) {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/archive");
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTaskSafely(taskId: string) {
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");
  await db.update(tasks).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "archived", newValue: task.title });
  refreshTaskViews(taskId);
}

export async function restoreTask(taskId: string) {
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");
  await db.update(tasks).set({ archivedAt: null, updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "restored", newValue: task.title });
  refreshTaskViews(taskId);
}
