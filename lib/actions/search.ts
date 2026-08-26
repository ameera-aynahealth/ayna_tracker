"use server";

import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";
import { trackers } from "@/db/tracker-schema";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { and, eq, ilike, isNull, or } from "drizzle-orm";

export async function searchWorkspace(rawQuery: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) return { tasks: [], trackers: [], projects: [], people: [] };

  const query = rawQuery.trim();
  if (query.length < 2) return { tasks: [], trackers: [], projects: [], people: [] };
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

  const [taskRows, trackerRows, projectRows, peopleRows] = await Promise.all([
    db.query.tasks.findMany({
      where: and(
        eq(tasks.workspaceId, user.workspaceId),
        isNull(tasks.archivedAt),
        or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)),
      ),
      with: { project: true, owner: true },
      orderBy: [tasks.title],
      limit: 12,
    }),
    db.query.trackers.findMany({
      where: and(
        eq(trackers.workspaceId, user.workspaceId),
        isNull(trackers.archivedAt),
        or(ilike(trackers.name, pattern), ilike(trackers.description, pattern)),
      ),
      orderBy: [trackers.name],
      limit: 8,
    }),
    db.query.projects.findMany({
      where: and(
        eq(projects.workspaceId, user.workspaceId),
        isNull(projects.archivedAt),
        or(ilike(projects.name, pattern), ilike(projects.description, pattern)),
      ),
      orderBy: [projects.name],
      limit: 8,
    }),
    db.query.users.findMany({
      where: and(
        eq(users.workspaceId, user.workspaceId),
        eq(users.active, true),
        or(ilike(users.name, pattern), ilike(users.email, pattern)),
      ),
      orderBy: [users.name],
      limit: 8,
    }),
  ]);

  return {
    tasks: taskRows.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      project: task.project?.name ?? null,
      owner: task.owner?.name ?? null,
      dueAt: task.dueAt?.toISOString() ?? null,
    })),
    trackers: trackerRows.map((tracker) => ({ id: tracker.id, name: tracker.name, itemLabel: tracker.itemLabel })),
    projects: projectRows.map((project) => ({ id: project.id, name: project.name, status: project.status, health: project.health })),
    people: peopleRows.map((person) => ({ id: person.id, name: person.name, email: person.email, role: person.role })),
  };
}
