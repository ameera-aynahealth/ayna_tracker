import "server-only";

import { db } from "@/db";
import { notificationDeliveries, taskCollaborators, tasks, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { OPEN_STATUS_LIST } from "@/lib/date-utils";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { nanoid } from "nanoid";

const OPEN_STATUSES = OPEN_STATUS_LIST as unknown as Array<
  "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review"
>;

const ONE_HOUR_GIF = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzdmYmVoeHZ6MnlpMDl1cW5neXU0aHQwcGJ2aHBoZ2c1eHppdndwZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uxXNV3Xa7QqME/giphy.gif";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function taskLabel(task: {
  title: string;
  dueAt: Date | null;
  project?: { name: string } | null;
}, timezone: string) {
  const time = task.dueAt ? formatInTimeZone(task.dueAt, timezone, "h:mm a") : "No time";
  const project = task.project?.name ? ` · ${task.project.name}` : "";
  return `${task.title}${project} · ${time}`;
}

export async function processOneHourDeadlineEmails(now = new Date()) {
  const [activeUsers, openTasks, collaboratorRows] = await Promise.all([
    db.query.users.findMany({ where: eq(users.active, true) }),
    db.query.tasks.findMany({
      where: and(isNull(tasks.archivedAt), inArray(tasks.status, OPEN_STATUSES)),
      with: { project: true },
    }),
    db.select({ taskId: taskCollaborators.taskId, userId: taskCollaborators.userId }).from(taskCollaborators),
  ]);

  let sent = 0;
  let suppressed = 0;
  let failed = 0;

  for (const user of activeUsers) {
    const timezone = user.timezone || "America/New_York";
    const collaboratorTaskIds = new Set(
      collaboratorRows.filter((row) => row.userId === user.id).map((row) => row.taskId),
    );
    const assigned = openTasks.filter(
      (task) => task.ownerId === user.id || collaboratorTaskIds.has(task.id),
    );

    const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowKey = formatInTimeZone(tomorrow, timezone, "yyyy-MM-dd");

    for (const task of assigned) {
      if (!task.dueAt) continue;

      const minutesUntil = (task.dueAt.getTime() - now.getTime()) / 60000;
      if (minutesUntil < 45 || minutesUntil > 75) continue;

      const dedupeKey = `one-hour:${task.id}:${user.id}:${task.dueAt.toISOString()}`;
      const deliveryId = nanoid();
      const claimed = await db
        .insert(notificationDeliveries)
        .values({
          id: deliveryId,
          dedupeKey,
          userId: user.id,
          taskId: task.id,
          type: "due_soon",
          destinationEmail: user.email,
        })
        .onConflictDoNothing({ target: notificationDeliveries.dedupeKey })
        .returning({ id: notificationDeliveries.id });

      if (!claimed[0]) continue;

      const dueLabel = formatInTimeZone(task.dueAt, timezone, "EEE, MMM d 'at' h:mm a zzz");
      const overdueTasks = assigned
        .filter((item) => item.id !== task.id && item.dueAt && item.dueAt.getTime() < now.getTime())
        .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
      const otherTodayTasks = assigned
        .filter((item) => item.id !== task.id && item.dueAt && item.dueAt.getTime() >= now.getTime() && formatInTimeZone(item.dueAt, timezone, "yyyy-MM-dd") === todayKey)
        .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
      const dueTomorrowTasks = assigned
        .filter((item) => item.id !== task.id && item.dueAt && formatInTimeZone(item.dueAt, timezone, "yyyy-MM-dd") === tomorrowKey)
        .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

      const overdue = overdueTasks.slice(0, 8).map((item) => taskLabel(item, timezone));
      const otherToday = otherTodayTasks.slice(0, 8).map((item) => taskLabel(item, timezone));
      const dueTomorrow = dueTomorrowTasks.slice(0, 8).map((item) => taskLabel(item, timezone));

      const sections = [
        {
          title: "This is the one",
          items: [
            task.project?.name ? `Project: ${task.project.name}` : "No project",
            `Due: ${dueLabel}`,
            `Priority: ${task.priority.replaceAll("_", " ")}`,
            "Already did it? Check it off in the tracker so we stop yelling at you.",
          ],
        },
        ...(overdue.length ? [{ title: "Overdue", items: overdue }] : []),
        ...(otherToday.length ? [{ title: "Also due later today", items: otherToday }] : []),
        ...(dueTomorrow.length ? [{ title: "Due tomorrow", items: dueTomorrow }] : []),
      ];

      try {
        const result = await sendTrackerEmail({
          to: user.email,
          subject: `Baddie, this is due in an hour: ${task.title}`,
          html: emailLayout({
            eyebrow: "One-hour warning",
            title: "HEY BADDIE YOU HAVE THIS DUE IN AN HOUR",
            intro: task.title,
            visualStats: [
              { label: "Overdue", value: overdueTasks.length },
              { label: "Due today", value: otherTodayTasks.length + 1 },
              { label: "Due tomorrow", value: dueTomorrowTasks.length },
            ],
            visualStatsPosition: "bottom",
            imageUrl: ONE_HOUR_GIF,
            imageAlt: "Deadline reminder",
            imagePosition: "bottom",
            sections,
            ctaLabel: "Open task + check it off",
            ctaUrl: appUrl(`/tasks/${task.id}`),
          }),
        });

        await db
          .update(notificationDeliveries)
          .set({
            success: true,
            sentAt: new Date(),
            providerMessageId: result.id,
            failureMessage: null,
          })
          .where(eq(notificationDeliveries.id, deliveryId));

        if (result.suppressed) suppressed += 1;
        else sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email error";
        await db
          .update(notificationDeliveries)
          .set({ success: false, failureMessage: message })
          .where(eq(notificationDeliveries.id, deliveryId));
        failed += 1;
      }
    }
  }

  return { oneHourEmailsSent: sent, oneHourEmailsSuppressed: suppressed, oneHourEmailsFailed: failed };
}
