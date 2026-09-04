import "server-only";

import { db } from "@/db";
import { notificationDeliveries, tasks, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { getMyWorkBuckets } from "@/lib/queries";
import { OPEN_STATUS_LIST } from "@/lib/date-utils";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { nanoid } from "nanoid";

const OPEN_STATUSES = OPEN_STATUS_LIST as unknown as Array<
  "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review"
>;

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

async function claimDelivery(dedupeKey: string, userId: string, email: string, type: "daily_digest" | "weekly_digest") {
  const id = nanoid();
  const inserted = await db.insert(notificationDeliveries).values({
    id,
    dedupeKey,
    userId,
    type,
    destinationEmail: email,
  }).onConflictDoNothing({ target: notificationDeliveries.dedupeKey }).returning({ id: notificationDeliveries.id });
  return inserted[0]?.id ?? null;
}

async function finishDelivery(deliveryId: string, success: boolean, providerMessageId?: string | null, failureMessage?: string | null) {
  await db.update(notificationDeliveries).set({
    success,
    sentAt: success ? new Date() : null,
    providerMessageId: providerMessageId ?? null,
    failureMessage: failureMessage ?? null,
  }).where(eq(notificationDeliveries.id, deliveryId));
}

function taskName(task: { title: string; project?: { name: string } | null }) {
  return task.project?.name ? `${task.title} — ${task.project.name}` : task.title;
}

export async function processScheduledTeamEmails(now = new Date()) {
  const [activeUsers, openTasks, allTasks] = await Promise.all([
    db.query.users.findMany({ where: eq(users.active, true) }),
    db.query.tasks.findMany({
      where: and(isNull(tasks.archivedAt), inArray(tasks.status, OPEN_STATUSES)),
      with: { project: true },
    }),
    db.query.tasks.findMany({
      where: isNull(tasks.archivedAt),
      with: { project: true },
    }),
  ]);

  let sent = 0;
  let failed = 0;

  for (const user of activeUsers) {
    const timezone = user.timezone || "America/New_York";
    const localHour = Number(formatInTimeZone(now, timezone, "H"));
    const localDay = formatInTimeZone(now, timezone, "yyyy-MM-dd");
    const localWeekday = Number(formatInTimeZone(now, timezone, "i"));

    if (user.weeklyDigest && localWeekday === 1 && localHour === 9) {
      const weekAgo = now.getTime() - 7 * 86400000;
      const nextWeek = now.getTime() + 7 * 86400000;
      const completedThisWeek = allTasks.filter((task) => task.completedAt && task.completedAt.getTime() >= weekAgo);
      const overdue = openTasks.filter((task) => task.dueAt && task.dueAt.getTime() < now.getTime());
      const urgent = openTasks.filter((task) => task.priority === "urgent");
      const blocked = openTasks.filter((task) => task.status === "blocked");
      const dueThisWeek = openTasks.filter((task) => task.dueAt && task.dueAt.getTime() >= now.getTime() && task.dueAt.getTime() <= nextWeek);

      const deliveryId = await claimDelivery(`team-weekly:${user.id}:${localDay}`, user.id, user.email, "weekly_digest");
      if (deliveryId) {
        try {
          const result = await sendTrackerEmail({
            to: user.email,
            subject: "ayna team weekly recap",
            html: emailLayout({
              eyebrow: "Monday team recap",
              title: "HERE'S WHAT THE TEAM HAS GOING ON THIS WEEK",
              intro: `${completedThisWeek.length} completed in the last 7 days. ${openTasks.length} open across the team.`,
              visualStats: [
                { label: "Completed last 7 days", value: completedThisWeek.length },
                { label: "Due this week", value: dueThisWeek.length },
                { label: "Overdue", value: overdue.length },
                { label: "Urgent", value: urgent.length },
                { label: "Blocked", value: blocked.length },
              ],
              sections: [
                { title: "Due this week", items: dueThisWeek.slice(0, 12).map(taskName) },
                { title: "Overdue", items: overdue.slice(0, 10).map(taskName) },
                { title: "Blocked", items: blocked.slice(0, 8).map(taskName) },
                { title: "Recently completed", items: completedThisWeek.slice(0, 10).map(taskName) },
              ],
              ctaLabel: "Open tracker",
              ctaUrl: appUrl("/tasks"),
            }),
          });
          await finishDelivery(deliveryId, true, result.id);
          if (!result.suppressed) sent += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown email error";
          await finishDelivery(deliveryId, false, null, message);
          failed += 1;
        }
      }
    }

    if (user.dailyDigest && localHour === 17) {
      const buckets = await getMyWorkBuckets(user.id);
      const urgent = buckets.all.filter((task) => task.priority === "urgent");
      const unfinishedImportant = [...buckets.overdue, ...urgent.filter((task) => !buckets.overdue.some((item) => item.id === task.id))];
      if (unfinishedImportant.length === 0) continue;

      const deliveryId = await claimDelivery(`eod:${user.id}:${localDay}`, user.id, user.email, "daily_digest");
      if (!deliveryId) continue;

      try {
        const result = await sendTrackerEmail({
          to: user.email,
          subject: "Before you log off: unfinished ayna tasks",
          html: emailLayout({
            eyebrow: "End-of-day check",
            title: "BADDIE BEFORE U LOG OFF",
            intro: `You still have ${unfinishedImportant.length} urgent or overdue ${unfinishedImportant.length === 1 ? "task" : "tasks"} that need attention.`,
            visualStats: [
              { label: "Overdue", value: buckets.overdue.length },
              { label: "Urgent", value: urgent.length },
              { label: "Due tomorrow", value: buckets.dueTomorrow.length },
              { label: "Blocked / waiting", value: buckets.blocked.length + buckets.waiting.length },
            ],
            sections: [
              { title: "Handle these first", items: unfinishedImportant.slice(0, 12).map(taskName) },
              { title: "Due tomorrow", items: buckets.dueTomorrow.slice(0, 8).map(taskName) },
            ],
            ctaLabel: "Open my tasks",
            ctaUrl: appUrl("/my-work"),
          }),
        });
        await finishDelivery(deliveryId, true, result.id);
        if (!result.suppressed) sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email error";
        await finishDelivery(deliveryId, false, null, message);
        failed += 1;
      }
    }
  }

  return { scheduledTeamEmailsSent: sent, scheduledTeamEmailsFailed: failed };
}
