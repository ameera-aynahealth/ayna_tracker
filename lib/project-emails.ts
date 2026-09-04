import "server-only";

import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { and, eq, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";

const BATCH_THREE_GIF = "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ejd2Y2thcHRrb3F4eDVqYnF0bG5hbWZmOTFpbHhvMDJxaHdiM2gwaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/06fgUXAYzlUsTU2LKS/giphy.gif";

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
    const openTasks = projectTasks.filter((task) => !["completed", "cancelled"].includes(task.status));
    const open = openTasks.length;
    const blocked = projectTasks.filter((task) => task.status === "blocked").length;
    const overdue = openTasks.filter((task) => task.dueAt && task.dueAt.getTime() < Date.now()).length;
    const movedEarlier = Boolean(
      input.kind === "deadline_changed" &&
      input.previousDueDate &&
      input.project.dueDate &&
      input.project.dueDate.getTime() < input.previousDueDate.getTime(),
    );

    await Promise.all(teammates.filter((user) => Boolean(user.email)).map(async (recipient) => {
      const timezone = recipient.timezone || "America/New_York";
      const isCompleted = input.kind === "completed";
      const detailItems = isCompleted
        ? [
            `Project: ${input.project.name}`,
            `Completed by: ${input.actorName}`,
            `Completed tasks: ${completed}`,
            `Still open: ${open}`,
            `Blocked: ${blocked}`,
          ]
        : [
            input.previousDueDate
              ? `Previous deadline: ${formatInTimeZone(input.previousDueDate, timezone, "EEE, MMM d 'at' h:mm a zzz")}`
              : "Previous deadline: None",
            input.project.dueDate
              ? `New deadline: ${formatInTimeZone(input.project.dueDate, timezone, "EEE, MMM d 'at' h:mm a zzz")}`
              : "New deadline: None",
            `Open tasks: ${open}`,
            `Overdue tasks: ${overdue}`,
          ];

      await sendTrackerEmail({
        to: recipient.email,
        subject: isCompleted ? `Project completed: ${input.project.name}` : `Project deadline changed: ${input.project.name}`,
        html: emailLayout({
          eyebrow: isCompleted ? "PROJECT COMPLETED" : "DEADLINE UPDATE",
          title: isCompleted
            ? "BADDIES WE FINISHED A WHOLE PROJECT"
            : movedEarlier
              ? "THIS DEADLINE JUST GOT MOVED UP"
              : "HEADS UP, THIS DEADLINE CHANGED",
          intro: isCompleted
            ? `${input.project.name} has officially been marked complete.`
            : `${input.actorName} updated the deadline for ${input.project.name}.`,
          visualStats: isCompleted ? [
            { label: "Completed", value: completed },
            { label: "Still open", value: open },
            { label: "Blocked", value: blocked },
          ] : [
            { label: "Open", value: open },
            { label: "Overdue", value: overdue },
          ],
          sections: [{ title: "Project update", items: detailItems }],
          imageUrl: BATCH_THREE_GIF,
          imageAlt: "Ayna project update",
          imagePosition: "bottom",
          ctaLabel: "View project",
          ctaUrl: appUrl(`/projects/${input.project.id}`),
        }),
      });
    }));
  } catch (error) {
    console.error("[project-email]", input.kind, input.project.id, error instanceof Error ? error.message : error);
  }
}
