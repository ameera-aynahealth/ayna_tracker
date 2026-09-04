import "server-only";

import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { and, eq, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function sendProjectEmail(input: {
  kind: "completed" | "deadline_changed";
  workspaceId: string;
  actorName: string;
  project: { id: string; name: string; dueDate?: Date | null };
  previousDueDate?: Date | null;
}) {
  try {
    const [teammates, projectTasks] = await Promise.all([
      db.query.users.findMany({ where: and(eq(users.workspaceId, input.workspaceId), eq(users.active, true)) }),
      db.query.tasks.findMany({ where: and(eq(tasks.projectId, input.project.id), isNull(tasks.archivedAt)) }),
    ]);

    const completed = projectTasks.filter((task) => task.status === "completed").length;
    const open = projectTasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length;
    const blocked = projectTasks.filter((task) => task.status === "blocked").length;

    await Promise.all(teammates.filter((user) => Boolean(user.email)).map(async (recipient) => {
      const timezone = recipient.timezone || "America/New_York";
      const isCompleted = input.kind === "completed";
      const detailItems = isCompleted
        ? [`Completed tasks: ${completed}`, `Remaining open tasks: ${open}`, `Blocked tasks: ${blocked}`]
        : [
            input.previousDueDate ? `Previous deadline: ${formatInTimeZone(input.previousDueDate, timezone, "EEE, MMM d 'at' h:mm a zzz")}` : "Previous deadline: None",
            input.project.dueDate ? `New deadline: ${formatInTimeZone(input.project.dueDate, timezone, "EEE, MMM d 'at' h:mm a zzz")}` : "New deadline: None",
          ];

      await sendTrackerEmail({
        to: recipient.email,
        subject: isCompleted ? `Project completed: ${input.project.name}` : `Project deadline changed: ${input.project.name}`,
        html: emailLayout({
          eyebrow: isCompleted ? "Project completed" : "Project deadline changed",
          title: isCompleted ? `${input.actorName} completed ${input.project.name}` : `${input.actorName} changed a project deadline`,
          intro: input.project.name,
          visualStats: isCompleted ? [
            { label: "Completed", value: completed },
            { label: "Open", value: open },
            { label: "Blocked", value: blocked },
          ] : undefined,
          sections: [{ title: "Project update", items: detailItems }],
          ctaLabel: "View project",
          ctaUrl: appUrl(`/projects/${input.project.id}`),
        }),
      });
    }));
  } catch (error) {
    console.error("[project-email]", input.kind, input.project.id, error instanceof Error ? error.message : error);
  }
}
