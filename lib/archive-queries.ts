import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { desc, inArray, isNotNull, or } from "drizzle-orm";

export async function getArchiveView() {
  const closedTaskStatuses: ("completed" | "cancelled")[] = ["completed", "cancelled"];
  const closedProjectStatuses: ("completed" | "cancelled")[] = ["completed", "cancelled"];

  const [archivedTasks, archivedProjects] = await Promise.all([
    db.query.tasks.findMany({
      where: or(
        isNotNull(tasks.archivedAt),
        inArray(tasks.status, closedTaskStatuses)
      ),
      with: { owner: true, project: true },
      orderBy: [desc(tasks.completedAt), desc(tasks.updatedAt)],
      limit: 250,
    }),
    db.query.projects.findMany({
      where: or(
        isNotNull(projects.archivedAt),
        inArray(projects.status, closedProjectStatuses)
      ),
      with: { owner: true },
      orderBy: [desc(projects.updatedAt)],
    }),
  ]);

  return { tasks: archivedTasks, projects: archivedProjects };
}
