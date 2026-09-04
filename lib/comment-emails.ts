import "server-only";

import { db } from "@/db";
import { comments, taskCollaborators, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { and, desc, eq } from "drizzle-orm";

const BATCH_ONE_GIF = "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZnVpOTN6eHdzM2hva2FscG5rdnVvdnpoenY3dG9oa3JwYmpndnBzciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Oxo2kvkxh25wKnC85g/giphy.gif";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

async function sendOne(input: {
  to: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
  body: string;
  mentioned: boolean;
}) {
  await sendTrackerEmail({
    to: input.to,
    subject: input.mentioned ? `${input.actorName} mentioned you: ${input.taskTitle}` : `New comment: ${input.taskTitle}`,
    html: emailLayout({
      eyebrow: input.mentioned ? "You were mentioned" : "New task comment",
      title: input.mentioned ? `${input.actorName} mentioned you in a task` : `${input.actorName} commented on your task`,
      intro: input.taskTitle,
      sections: [{ title: "Comment", items: [input.body.slice(0, 500)] }],
      imageUrl: BATCH_ONE_GIF,
      imageAlt: "Ayna comment update",
      imagePosition: "bottom",
      ctaLabel: "Open task",
      ctaUrl: appUrl(`/tasks/${input.taskId}`),
    }),
  });
}

export async function sendCommentActivityEmails(input: {
  task: { id: string; title: string; ownerId: string | null; workspaceId: string };
  actor: { id: string; name: string };
}) {
  try {
    const [latestComment, members, collaboratorRows] = await Promise.all([
      db.query.comments.findFirst({
        where: and(eq(comments.taskId, input.task.id), eq(comments.userId, input.actor.id)),
        orderBy: [desc(comments.createdAt)],
      }),
      db.query.users.findMany({ where: and(eq(users.workspaceId, input.task.workspaceId), eq(users.active, true)) }),
      db.select({ userId: taskCollaborators.userId }).from(taskCollaborators).where(eq(taskCollaborators.taskId, input.task.id)),
    ]);
    if (!latestComment) return;

    const lowerBody = latestComment.body.toLowerCase();
    const mentioned = members.filter((member) => {
      if (member.id === input.actor.id) return false;
      const first = member.name.split(" ")[0]?.toLowerCase();
      const full = member.name.toLowerCase();
      return Boolean(first && lowerBody.includes(`@${first}`)) || lowerBody.includes(`@${full}`);
    });

    await Promise.all(mentioned.map((member) => sendOne({
      to: member.email,
      actorName: input.actor.name,
      taskId: input.task.id,
      taskTitle: input.task.title,
      body: latestComment.body,
      mentioned: true,
    })));

    const mentionedIds = new Set(mentioned.map((member) => member.id));
    const assigneeIds = [...new Set([input.task.ownerId, ...collaboratorRows.map((row) => row.userId)].filter((id): id is string => Boolean(id)))];
    const assignees = members.filter((member) => assigneeIds.includes(member.id) && member.id !== input.actor.id && !mentionedIds.has(member.id));

    await Promise.all(assignees.map((member) => sendOne({
      to: member.email,
      actorName: input.actor.name,
      taskId: input.task.id,
      taskTitle: input.task.title,
      body: latestComment.body,
      mentioned: false,
    })));
  } catch (error) {
    console.error("[comment-email]", input.task.id, error instanceof Error ? error.message : error);
  }
}
