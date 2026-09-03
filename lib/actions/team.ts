"use server";

import { db } from "@/db";
import {
  projects,
  subtasks,
  taskCollaborators,
  taskReviewers,
  tasks,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ensureTaskPeopleSchema } from "@/lib/ensure-task-people";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Removes a teammate from the active tracker without deleting historical
 * comments/activity rows that still reference that user. Current assignments
 * and review responsibility are cleared or promoted to another selected
 * teammate when possible.
 */
export async function deleteTeamUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You cannot delete your own tracker user");

  await ensureTaskPeopleSchema();
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target || !target.active) return;
  if (target.workspaceId !== admin.workspaceId) throw new Error("User is not in this workspace");

  const [ownedTasks, legacyReviewTasks] = await Promise.all([
    db.query.tasks.findMany({ where: eq(tasks.ownerId, userId) }),
    db.query.tasks.findMany({ where: eq(tasks.reviewerId, userId) }),
  ]);

  await db.transaction(async (tx) => {
    // Remove the person from additional-assignee/reviewer joins first.
    await tx.delete(taskCollaborators).where(eq(taskCollaborators.userId, userId));
    await tx.delete(taskReviewers).where(eq(taskReviewers.userId, userId));

    // If the deleted person was the primary assignee, promote another existing
    // assignee where possible so the task does not become ownerless needlessly.
    for (const task of ownedTasks) {
      const remaining = await tx.select({ userId: taskCollaborators.userId })
        .from(taskCollaborators)
        .where(eq(taskCollaborators.taskId, task.id));
      const replacementId = remaining[0]?.userId ?? null;
      await tx.update(tasks).set({
        ownerId: replacementId,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      }).where(eq(tasks.id, task.id));
      if (replacementId) {
        await tx.delete(taskCollaborators).where(eq(taskCollaborators.taskId, task.id));
        const rest = remaining.filter((row) => row.userId !== replacementId);
        if (rest.length) {
          await tx.insert(taskCollaborators).values(
            rest.map((row) => ({ taskId: task.id, userId: row.userId }))
          ).onConflictDoNothing();
        }
      }
    }

    // Keep reviewerId aligned with the first remaining reviewer for older views.
    for (const task of legacyReviewTasks) {
      const remaining = await tx.select({ userId: taskReviewers.userId })
        .from(taskReviewers)
        .where(eq(taskReviewers.taskId, task.id));
      await tx.update(tasks).set({
        reviewerId: remaining[0]?.userId ?? null,
        reviewRequired: remaining.length > 0 ? task.reviewRequired : false,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      }).where(eq(tasks.id, task.id));
    }

    await tx.update(projects).set({ ownerId: null, updatedAt: new Date() }).where(eq(projects.ownerId, userId));
    await tx.update(subtasks).set({ ownerId: null }).where(eq(subtasks.ownerId, userId));
    await tx.update(tasks).set({ blockedById: null, updatedAt: new Date() }).where(eq(tasks.blockedById, userId));

    // Soft-delete the account so historical authored records remain intact and
    // the person can no longer sign into the tracker.
    await tx.update(users).set({ active: false, updatedAt: new Date() }).where(eq(users.id, userId));
  });

  revalidatePath("/team");
  revalidatePath("/");
  revalidatePath("/my-work");
  revalidatePath("/tasks");
  revalidatePath("/board");
  revalidatePath("/calendar");
  revalidatePath("/analytics");
  revalidatePath("/projects");
}
