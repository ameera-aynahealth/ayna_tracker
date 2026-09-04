"use server";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireEditPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { sendProjectEmail } from "@/lib/project-emails";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  workstreamId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createProject(input: z.infer<typeof createProjectSchema>) {
  const user = await requireEditPermission();
  const parsed = createProjectSchema.parse(input);
  const id = nanoid();

  await db.insert(projects).values({
    id,
    workspaceId: user.workspaceId,
    name: parsed.name,
    description: parsed.description,
    ownerId: parsed.ownerId ?? user.id,
    workstreamId: parsed.workstreamId,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    status: "planning",
    health: "on_track",
  });

  await logActivity({ projectId: id, userId: user.id, action: "created", newValue: parsed.name });
  revalidatePath("/projects");
  return id;
}

export async function updateProjectStatus(projectId: string, status: string) {
  const user = await requireEditPermission();
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!existing) throw new Error("Project not found");

  await db.update(projects).set({ status: status as typeof projects.$inferInsert.status, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({
    projectId,
    userId: user.id,
    action: "status_changed",
    field: "status",
    oldValue: existing.status,
    newValue: status,
  });

  if (status === "completed" && existing.status !== "completed") {
    await sendProjectEmail({
      kind: "completed",
      workspaceId: existing.workspaceId,
      actorName: user.name,
      project: { id: existing.id, name: existing.name, dueDate: existing.dueDate },
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectDueDate(projectId: string, dueDate: string | null) {
  const user = await requireEditPermission();
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!existing) throw new Error("Project not found");

  const nextDueDate = dueDate ? new Date(dueDate) : null;
  if (nextDueDate && Number.isNaN(nextDueDate.getTime())) throw new Error("Invalid project due date");

  await db.update(projects).set({ dueDate: nextDueDate, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({
    projectId,
    userId: user.id,
    action: "dueDate_changed",
    field: "dueDate",
    oldValue: existing.dueDate?.toISOString() ?? null,
    newValue: nextDueDate?.toISOString() ?? null,
  });

  await sendProjectEmail({
    kind: "deadline_changed",
    workspaceId: existing.workspaceId,
    actorName: user.name,
    project: { id: existing.id, name: existing.name, dueDate: nextDueDate },
    previousDueDate: existing.dueDate,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

// "Delete" is intentionally recoverable. It removes the project from daily
// views but keeps its tasks/history safe in Archive in case it was accidental.
export async function archiveProject(projectId: string) {
  const user = await requireEditPermission();
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!existing) throw new Error("Project not found");

  await db.update(projects).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({ projectId, userId: user.id, action: "archived", newValue: existing.name });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/archive");
  revalidatePath(`/projects/${projectId}`);
}

export async function restoreProject(projectId: string) {
  const user = await requireEditPermission();
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!existing) throw new Error("Project not found");

  await db.update(projects).set({ archivedAt: null, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await logActivity({ projectId, userId: user.id, action: "restored", newValue: existing.name });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/archive");
  revalidatePath(`/projects/${projectId}`);
}
