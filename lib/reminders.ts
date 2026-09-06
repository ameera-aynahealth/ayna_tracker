import "server-only";

import { db } from "@/db";
import { notificationDeliveries, notifications, tasks, users } from "@/db/schema";
import { emailLayout, sendTrackerEmail } from "@/lib/email";
import { getMyWorkBuckets } from "@/lib/queries";
import { OPEN_STATUS_LIST } from "@/lib/date-utils";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { nanoid } from "nanoid";

type NotificationType =
  | "assigned"
  | "mentioned"
  | "due_soon"
  | "overdue"
  | "review_requested"
  | "comment"
  | "blocked"
  | "unblocked"
  | "project_update"
  | "daily_digest"
  | "weekly_digest";

type ReminderSummary = {
  checked: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsSuppressed: number;
  emailsFailed: number;
};

const OPEN_STATUSES = OPEN_STATUS_LIST as unknown as Array<
  "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review"
>;

const MORNING_GIF = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTVhajh2c2UxMW5rN243dTFicHFheWZyNmZmN29qczN6NWtseWE5MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CciM7ZRcjqY6P7HHdd/giphy.gif";

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function dayNumber(key: string) {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000);
}

function reminderDescriptor(daysUntil: number) {
  if (daysUntil === 7) return { type: "due_soon" as const, key: "7d", phrase: "due in 7 days" };
  if (daysUntil === 3) return { type: "due_soon" as const, key: "3d", phrase: "due in 3 days" };
  if (daysUntil === 1) return { type: "due_soon" as const, key: "1d", phrase: "due tomorrow" };
  if (daysUntil === 0) return { type: "due_soon" as const, key: "today", phrase: "due today" };
  if (daysUntil === -1) return { type: "overdue" as const, key: "1d-overdue", phrase: "1 day overdue" };
  if (daysUntil === -3) return { type: "overdue" as const, key: "3d-overdue", phrase: "3 days overdue" };
  if (daysUntil === -7) return { type: "overdue" as const, key: "7d-overdue", phrase: "7 days overdue" };
  if (daysUntil < -7 && Math.abs(daysUntil) % 3 === 1) {
    return { type: "overdue" as const, key: `${Math.abs(daysUntil)}d-overdue`, phrase: `${Math.abs(daysUntil)} days overdue` };
  }
  return null;
}

function taskLabel(task: { title: string; project?: { name: string } | null }) {
  return task.project?.name ? `${task.title} — ${task.project.name}` : task.title;
}

async function claimDelivery(input: {
  dedupeKey: string;
  userId: string;
  taskId?: string | null;
  type: NotificationType;
  email: string;
}) {
  const id = nanoid();
  const inserted = await db
    .insert(notificationDeliveries)
    .values({
      id,
      dedupeKey: input.dedupeKey,
      userId: input.userId,
      taskId: input.taskId ?? null,
      type: input.type,
      destinationEmail: input.email,
    })
    .onConflictDoNothing({ target: notificationDeliveries.dedupeKey })
    .returning({ id: notificationDeliveries.id });

  return inserted[0]?.id ?? null;
}

async function finishDelivery(
  deliveryId: string,
  result: { success: boolean; providerMessageId?: string | null; failureMessage?: string | null },
) {
  await db
    .update(notificationDeliveries)
    .set({
      success: result.success,
      sentAt: result.success ? new Date() : null,
      providerMessageId: result.providerMessageId ?? null,
      failureMessage: result.failureMessage ?? null,
    })
    .where(eq(notificationDeliveries.id, deliveryId));
}

async function deliver(input: {
  dedupeKey: string;
  user: typeof users.$inferSelect;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  subject: string;
  html: string;
  createInApp?: boolean;
  sendEmail?: boolean;
}, summary: ReminderSummary) {
  const deliveryId = await claimDelivery({
    dedupeKey: input.dedupeKey,
    userId: input.user.id,
    taskId: input.taskId,
    type: input.type,
    email: input.user.email,
  });

  if (!deliveryId) return;

  if (input.createInApp !== false) {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: input.user.id,
      taskId: input.taskId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
    });
    summary.notificationsCreated += 1;
  }

  if (input.sendEmail === false) {
    await finishDelivery(deliveryId, { success: true });
    return;
  }

  try {
    const sent = await sendTrackerEmail({
      to: input.user.email,
      subject: input.subject,
      html: input.html,
    });
    await finishDelivery(deliveryId, { success: true, providerMessageId: sent.id });
    if (sent.suppressed) summary.emailsSuppressed += 1;
    else summary.emailsSent += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await finishDelivery(deliveryId, { success: false, failureMessage: message });
    summary.emailsFailed += 1;
  }
}

export async function processReminderCycle(now = new Date()): Promise<ReminderSummary> {
  const summary: ReminderSummary = {
    checked: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    emailsSuppressed: 0,
    emailsFailed: 0,
  };

  const [activeUsers, openTasks] = await Promise.all([
    db.query.users.findMany({ where: eq(users.active, true) }),
    db.query.tasks.findMany({
      where: and(isNull(tasks.archivedAt), inArray(tasks.status, OPEN_STATUSES)),
      with: { owner: true, project: true },
    }),
  ]);

  summary.checked = openTasks.length;

  for (const user of activeUsers) {
    const timezone = user.timezone || "America/New_York";
    const localHour = Number(formatInTimeZone(now, timezone, "H"));
    const localDay = formatInTimeZone(now, timezone, "yyyy-MM-dd");
    const owned = openTasks.filter((task) => task.ownerId === user.id);

    // Keep task-level reminders inside the tracker, but never email them.
    // This prevents the inbox flood while preserving useful in-app alerts.
    if (localHour === 9) {
      for (const task of owned) {
        const reminderAt = task.status === "waiting" && task.followupAt ? task.followupAt : task.dueAt;
        if (!reminderAt) continue;

        const dueDay = formatInTimeZone(reminderAt, timezone, "yyyy-MM-dd");
        const daysUntil = dayNumber(dueDay) - dayNumber(localDay);
        const descriptor = reminderDescriptor(daysUntil);
        if (!descriptor) continue;

        if (descriptor.type === "due_soon" && !user.notifyOnDueSoon) continue;
        if (descriptor.type === "overdue" && !user.notifyOnOverdue) continue;

        const isFollowUp = task.status === "waiting" && Boolean(task.followupAt);
        const label = isFollowUp ? "Follow-up" : "Task";
        const projectLabel = task.project?.name ? `Project: ${task.project.name}` : "No project";
        const dueLabel = formatInTimeZone(reminderAt, timezone, "EEE, MMM d 'at' h:mm a zzz");
        const targetVersion = reminderAt.toISOString();

        await deliver({
          dedupeKey: `task:${task.id}:${user.id}:${descriptor.key}:${targetVersion}`,
          user,
          taskId: task.id,
          type: descriptor.type,
          title: `${label} ${descriptor.phrase}: ${task.title}`,
          body: `${projectLabel}. ${dueLabel}.`,
          subject: "",
          html: "",
          sendEmail: false,
        }, summary);
      }
    }

    // 9 AM: one consolidated morning briefing per teammate.
    if (localHour === 9) {
      const buckets = await getMyWorkBuckets(user.id);
      const firstName = (user.name.trim().split(/\s+/)[0] || "BADDIE").toUpperCase();
      const dueTodayCount = buckets.dueToday.length;
      const remainingCount = buckets.all.length;
      const wakeTitle = `WAKE UP ${firstName} U HAVE SHIT TO GET DONE HERE'S THE BREAKDOWN BADDIE`;
      const todayItems = buckets.dueToday.length
        ? buckets.dueToday.slice(0, 12).map(taskLabel)
        : ["Nothing due today. Use the opening to knock out something overdue or get ahead."];

      await deliver({
        dedupeKey: `daily-am:${user.id}:${localDay}`,
        user,
        type: "daily_digest",
        title: wakeTitle,
        body: `${dueTodayCount} due today. ${remainingCount} total tasks left.`,
        subject: "Daily ayna briefing",
        createInApp: false,
        html: emailLayout({
          eyebrow: "9 AM ayna briefing",
          title: wakeTitle,
          intro: `${remainingCount} total ${remainingCount === 1 ? "task" : "tasks"} left on your plate. Here is what matters first.`,
          topSection: {
            title: `Due today · ${dueTodayCount}`,
            items: todayItems,
          },
          visualStats: [
            { label: "Due today", value: dueTodayCount },
            { label: "Overdue", value: buckets.overdue.length },
            { label: "Coming up this week", value: buckets.dueTomorrow.length + buckets.thisWeek.length },
            { label: "Blocked / waiting", value: buckets.blocked.length + buckets.waiting.length },
          ],
          imageUrl: MORNING_GIF,
          imageAlt: "Morning motivation",
          sections: [
            { title: "Overdue", items: buckets.overdue.slice(0, 10).map(taskLabel) },
            { title: "Due tomorrow", items: buckets.dueTomorrow.slice(0, 8).map(taskLabel) },
            { title: "Coming up this week", items: buckets.thisWeek.slice(0, 10).map(taskLabel) },
            { title: "Blocked", items: buckets.blocked.slice(0, 8).map(taskLabel) },
            { title: "Waiting", items: buckets.waiting.slice(0, 8).map(taskLabel) },
            { title: "Needs review", items: buckets.needsReview.slice(0, 8).map(taskLabel) },
            { title: "No due date yet", items: buckets.noDueDate.slice(0, 8).map(taskLabel) },
          ],
          ctaLabel: "Open my tasks",
          ctaUrl: appUrl("/my-work"),
        }),
      }, summary);
    }

    // 5 PM: one consolidated wrap-up. No other tracker emails are sent.
    if (localHour === 17) {
      const buckets = await getMyWorkBuckets(user.id);
      const firstName = (user.name.trim().split(/\s+/)[0] || "BADDIE").toUpperCase();
      const remainingCount = buckets.all.length;
      const stillDueToday = buckets.dueToday.length;
      const wrapTitle = `5 PM CHECK-IN ${firstName} HERE'S WHAT'S STILL ON YOUR PLATE BADDIE`;
      const todayItems = buckets.dueToday.length
        ? buckets.dueToday.slice(0, 12).map(taskLabel)
        : ["Nothing else due today."];

      await deliver({
        dedupeKey: `daily-pm:${user.id}:${localDay}`,
        user,
        type: "daily_digest",
        title: wrapTitle,
        body: `${stillDueToday} still due today. ${remainingCount} total tasks remaining.`,
        subject: "5 PM ayna wrap-up",
        createInApp: false,
        html: emailLayout({
          eyebrow: "5 PM ayna wrap-up",
          title: wrapTitle,
          intro: `${remainingCount} total ${remainingCount === 1 ? "task" : "tasks"} still open. Here is what to close out or carry into tomorrow.`,
          topSection: {
            title: `Still due today · ${stillDueToday}`,
            items: todayItems,
          },
          visualStats: [
            { label: "Still due today", value: stillDueToday },
            { label: "Overdue", value: buckets.overdue.length },
            { label: "Due tomorrow", value: buckets.dueTomorrow.length },
            { label: "Blocked / waiting", value: buckets.blocked.length + buckets.waiting.length },
          ],
          sections: [
            { title: "Overdue", items: buckets.overdue.slice(0, 10).map(taskLabel) },
            { title: "Due tomorrow", items: buckets.dueTomorrow.slice(0, 10).map(taskLabel) },
            { title: "Coming up this week", items: buckets.thisWeek.slice(0, 10).map(taskLabel) },
            { title: "Blocked", items: buckets.blocked.slice(0, 8).map(taskLabel) },
            { title: "Waiting", items: buckets.waiting.slice(0, 8).map(taskLabel) },
            { title: "Needs review", items: buckets.needsReview.slice(0, 8).map(taskLabel) },
          ],
          ctaLabel: "Open my tasks",
          ctaUrl: appUrl("/my-work"),
        }),
      }, summary);
    }
  }

  return summary;
}
