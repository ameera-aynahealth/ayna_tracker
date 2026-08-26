"use server";

import { eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { trackers } from "@/db/tracker-schema";
import { requireAdmin } from "@/lib/auth";
import { ensureTrackerSchema } from "@/lib/ensure-trackers";

function refreshArchiveViews() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/trackers");
  revalidatePath("/archive");
}

export async function permanentlyDeleteTask(taskId: string) {
  await requireAdmin();

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error("Task not found");
  if (!task.archivedAt) throw new Error("Only archived tasks can be permanently deleted");

  // Clear non-FK references from other tasks before removing this row.
  await db
    .update(tasks)
    .set({ parentTaskId: null, blockedById: null, updatedAt: new Date() })
    .where(or(eq(tasks.parentTaskId, taskId), eq(tasks.blockedById, taskId)));

  // Related subtasks, comments, collaborators, tags, attachments, activity,
  // notifications, and deliveries are configured to cascade from the task.
  await db.delete(tasks).where(eq(tasks.id, taskId));
  refreshArchiveViews();
}

export async function permanentlyDeleteProject(projectId: string) {
  await requireAdmin();

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) throw new Error("Project not found");
  if (!project.archivedAt) throw new Error("Only archived projects can be permanently deleted");

  // A project can be archived while its tasks remain active. Preserve those
  // tasks by detaching them instead of destroying unrelated work.
  await db
    .update(tasks)
    .set({ projectId: null, updatedAt: new Date() })
    .where(eq(tasks.projectId, projectId));

  await db.delete(projects).where(eq(projects.id, projectId));
  refreshArchiveViews();
}

export async function permanentlyDeleteTracker(trackerId: string) {
  await requireAdmin();
  await ensureTrackerSchema();

  const tracker = await db.query.trackers.findFirst({ where: eq(trackers.id, trackerId) });
  if (!tracker) throw new Error("Tracker not found");
  if (!tracker.archivedAt) throw new Error("Only archived trackers can be permanently deleted");

  // Tracker items cascade with the tracker. Tasks created from tracker follow-ups
  // are separate task records and intentionally remain intact.
  await db.delete(trackers).where(eq(trackers.id, trackerId));
  refreshArchiveViews();
}
