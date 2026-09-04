import "server-only";

import { db } from "@/db";
import { users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { and, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";

export type TeamStatusEmailKind =
  | "completed"
  | "blocked"
  | "unblocked"
  | "urgent"
  | "due_earlier"
  | "due_changed"
  | "cancelled"
  | "owner_changed"
  | "reviewer_changed";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function copyFor(kind: TeamStatusEmailKind, actorName: string, taskTitle: string) {
  switch (kind) {
    case "completed":
      return { eyebrow: "Task completed", title: `${actorName} completed ${taskTitle}`, subject: `Task completed: ${taskTitle}` };
    case "blocked":
      return { eyebrow: "Task blocked", title: `${actorName} marked a task as blocked`, subject: `Task blocked: ${taskTitle}` };
    case "unblocked":
      return { eyebrow: "Task unblocked", title: `${taskTitle} is unblocked`, subject: `Task unblocked: ${taskTitle}` };
    case "urgent":
      return { eyebrow: "Priority update", title: `${actorName} changed a task to urgent`, subject: `Urgent: ${taskTitle}` };
    case "due_earlier":
      return { eyebrow: "Deadline moved earlier", title: `${actorName} moved a deadline earlier`, subject: `Deadline moved earlier: ${taskTitle}` };
    case "due_changed":
      return { eyebrow: "Deadline changed", title: `${actorName} changed a task deadline`, subject: `Deadline changed: ${taskTitle}` };
    case "cancelled":
      return { eyebrow: "Task cancelled", title: `${actorName} cancelled ${taskTitle}`, subject: `Task cancelled: ${taskTitle}` };
    case "owner_changed":
      return { eyebrow: "Owner changed", title: `${actorName} changed the task owner`, subject: `Owner changed: ${taskTitle}` };
    case "reviewer_changed":
      return { eyebrow: "Reviewer changed", title: `${actorName} changed the reviewer`, subject: `Reviewer changed: ${taskTitle}` };
  }
}

export async function sendTeamStatusEmail(input: {
  kind: TeamStatusEmailKind;
  workspaceId: string;
  actorName: string;
  task: { id: string; title: string; dueAt?: Date | null; priority?: string | null };
  extraItems?: string[];
}) {
  try {
    const teammates = await db.query.users.findMany({
      where: and(eq(users.workspaceId, input.workspaceId), eq(users.active, true)),
    });

    await Promise.all(teammates.filter((user) => Boolean(user.email)).map(async (recipient) => {
      const timezone = recipient.timezone || "America/New_York";
      const copy = copyFor(input.kind, input.actorName, input.task.title);
      const details = [
        `Task: ${input.task.title}`,
        input.task.dueAt ? `Due: ${formatInTimeZone(input.task.dueAt, timezone, "EEE, MMM d 'at' h:mm a zzz")}` : "Due: No due date",
        input.task.priority ? `Priority: ${input.task.priority.replaceAll("_", " ")}` : null,
        ...(input.extraItems ?? []),
      ].filter((item): item is string => Boolean(item));

      await sendTrackerEmail({
        to: recipient.email,
        subject: copy.subject,
        html: emailLayout({
          eyebrow: copy.eyebrow,
          title: copy.title,
          intro: input.task.title,
          sections: [{ title: "Update", items: details }],
          ctaLabel: "View task",
          ctaUrl: appUrl(`/tasks/${input.task.id}`),
        }),
      });
    }));
  } catch (error) {
    console.error("[team-status-email]", input.kind, input.task.id, error instanceof Error ? error.message : error);
  }
}
