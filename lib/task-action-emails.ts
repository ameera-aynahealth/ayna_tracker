import "server-only";

import { db } from "@/db";
import { users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";

const BATCH_ONE_GIF = "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZnVpOTN6eHdzM2hva2FscG5rdnVvdnpoenY3dG9oa3JwYmpndnBzciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Oxo2kvkxh25wKnC85g/giphy.gif";

type TaskActionEmailKind =
  | "assigned"
  | "reassigned"
  | "assigned_review"
  | "ready_review"
  | "approved"
  | "changes_requested";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function copyFor(kind: TaskActionEmailKind, actorName: string, taskTitle: string) {
  switch (kind) {
    case "assigned":
      return {
        eyebrow: "New assignment",
        title: `${actorName} assigned you a task`,
        subject: `New task assigned: ${taskTitle}`,
        cta: "Open task",
      };
    case "reassigned":
      return {
        eyebrow: "Task reassigned",
        title: `${actorName} reassigned a task to you`,
        subject: `Task reassigned to you: ${taskTitle}`,
        cta: "Open task",
      };
    case "assigned_review":
      return {
        eyebrow: "Review assignment",
        title: `${actorName} assigned you to review a task`,
        subject: `You were assigned to review: ${taskTitle}`,
        cta: "Review task",
      };
    case "ready_review":
      return {
        eyebrow: "Ready for review",
        title: `${taskTitle} is ready for your review`,
        subject: `Ready for review: ${taskTitle}`,
        cta: "Review task",
      };
    case "approved":
      return {
        eyebrow: "Review approved",
        title: `${actorName} approved your task`,
        subject: `Task approved: ${taskTitle}`,
        cta: "View task",
      };
    case "changes_requested":
      return {
        eyebrow: "Changes requested",
        title: `${actorName} requested changes`,
        subject: `Changes requested: ${taskTitle}`,
        cta: "Open task",
      };
  }
}

export async function sendTaskActionEmail(input: {
  kind: TaskActionEmailKind;
  recipientId: string;
  actorName: string;
  task: {
    id: string;
    title: string;
    dueAt?: Date | null;
    priority?: string | null;
  };
}) {
  try {
    const recipient = await db.query.users.findFirst({ where: eq(users.id, input.recipientId) });
    if (!recipient || !recipient.active || !recipient.email) return;

    const timezone = recipient.timezone || "America/New_York";
    const copy = copyFor(input.kind, input.actorName, input.task.title);
    const details = [
      `Task: ${input.task.title}`,
      input.task.dueAt
        ? `Due: ${formatInTimeZone(input.task.dueAt, timezone, "EEE, MMM d 'at' h:mm a zzz")}`
        : "Due: No due date",
      input.task.priority ? `Priority: ${input.task.priority.replaceAll("_", " ")}` : null,
    ].filter((item): item is string => Boolean(item));

    await sendTrackerEmail({
      to: recipient.email,
      subject: copy.subject,
      html: emailLayout({
        eyebrow: copy.eyebrow,
        title: copy.title,
        intro: input.task.title,
        sections: [{ title: "Task details", items: details }],
        imageUrl: BATCH_ONE_GIF,
        imageAlt: "Ayna task update",
        imagePosition: "bottom",
        ctaLabel: copy.cta,
        ctaUrl: appUrl(`/tasks/${input.task.id}`),
      }),
    });
  } catch (error) {
    console.error("[task-action-email]", input.kind, input.task.id, error instanceof Error ? error.message : error);
  }
}
