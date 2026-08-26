import { db } from "@/db";
import {
  activityLogs,
  comments,
  notificationDeliveries,
  notifications,
  projects,
  savedViews,
  subtasks,
  taskCollaborators,
  tasks,
  users,
  workstreams,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { startOfTodayUTC, OPEN_STATUS_LIST } from "@/lib/date-utils";

export { startOfTodayUTC };

// Centralized domain/query logic. Pages should call these helpers rather than
// re-implementing overdue, ownership, status, and project-count rules.
const OPEN_STATUSES = OPEN_STATUS_LIST;
type TaskStatus = "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed" | "cancelled";

export function isOpenStatus(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

function isOpenStatusSql() {
  return inArray(tasks.status, OPEN_STATUSES as unknown as TaskStatus[]);
}

export async function getWorkspace() {
  const rows = await db.query.workspaces.findMany({ limit: 1 });
  return rows[0] ?? null;
}

export async function getCurrentUserRecord(authProviderId: string) {
  return db.query.users.findFirst({ where: eq(users.authProviderId, authProviderId) });
}

export async function getActiveUsers() {
  return db.query.users.findMany({ where: eq(users.active, true), orderBy: [users.name] });
}

export async function getActiveProjects() {
  return db.query.projects.findMany({ where: isNull(projects.archivedAt), orderBy: [projects.name] });
}

export async function getActiveWorkstreams() {
  return db.query.workstreams.findMany({ where: isNull(workstreams.archivedAt), orderBy: [workstreams.name] });
}

// ---- My Work --------------------------------------------------------------

export async function getMyWorkBuckets(userId: string) {
  const [member, collaborationRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.select({ taskId: taskCollaborators.taskId }).from(taskCollaborators).where(eq(taskCollaborators.userId, userId)),
  ]);

  const today = startOfTodayUTC(member?.timezone ?? "America/New_York");
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 86400000);
  const sevenDays = new Date(today.getTime() + 7 * 86400000);
  const collaboratorIds = collaborationRows.map((row) => row.taskId);

  const ownership = collaboratorIds.length
    ? or(eq(tasks.ownerId, userId), eq(tasks.reviewerId, userId), inArray(tasks.id, collaboratorIds))
    : or(eq(tasks.ownerId, userId), eq(tasks.reviewerId, userId));

  const rows = await db.query.tasks.findMany({
    where: and(ownership, isNull(tasks.archivedAt), isOpenStatusSql()),
    with: { project: true, owner: true },
    orderBy: [tasks.dueAt, desc(tasks.priority)],
  });

  const overdue = rows.filter((t) => t.dueAt && t.dueAt < today && t.status !== "waiting" && t.status !== "blocked");
  const dueToday = rows.filter((t) => t.dueAt && t.dueAt >= today && t.dueAt < tomorrow);
  const dueTomorrow = rows.filter((t) => t.dueAt && t.dueAt >= tomorrow && t.dueAt < dayAfterTomorrow);
  const thisWeek = rows.filter((t) => t.dueAt && t.dueAt >= dayAfterTomorrow && t.dueAt < sevenDays);
  const waiting = rows.filter((t) => t.status === "waiting");
  const blocked = rows.filter((t) => t.status === "blocked");
  const needsReview = rows.filter((t) => t.status === "needs_review" || (t.reviewerId === userId && t.reviewRequired));
  const noDueDate = rows.filter((t) => !t.dueAt && !["waiting", "blocked", "needs_review"].includes(t.status));

  return { overdue, dueToday, dueTomorrow, thisWeek, waiting, blocked, needsReview, noDueDate, all: rows };
}

export async function getHomeSummary(userId: string) {
  const buckets = await getMyWorkBuckets(userId);
  return {
    overdue: buckets.overdue.length,
    dueToday: buckets.dueToday.length,
    dueThisWeek: buckets.dueToday.length + buckets.dueTomorrow.length + buckets.thisWeek.length,
    blocked: buckets.blocked.length,
    waiting: buckets.waiting.length,
    needsReview: buckets.needsReview.length,
    open: buckets.all.length,
  };
}

export async function getTopPriorities(userId: string, limit = 5) {
  const buckets = await getMyWorkBuckets(userId);
  return buckets.all
    .map((task) => ({ task, score: priorityScore(task) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ task }) => task);
}

function priorityScore(t: { dueAt: Date | null; priority: string; status: string }) {
  const today = startOfTodayUTC();
  let score = 0;
  if (t.dueAt && t.dueAt < today) score += 100;
  if (t.priority === "urgent") score += 55;
  if (t.dueAt && t.dueAt >= today && t.dueAt < new Date(today.getTime() + 86400000)) score += 40;
  if (t.priority === "high") score += 22;
  if (t.status === "blocked") score += 18;
  if (t.status === "needs_review") score += 16;
  if (t.status === "waiting") score -= 8;
  return score;
}

export async function getDashboardVisuals(userId: string) {
  const buckets = await getMyWorkBuckets(userId);
  const statusCounts = OPEN_STATUS_LIST.reduce<Record<string, number>>((acc, status) => {
    acc[status] = buckets.all.filter((t) => t.status === status).length;
    return acc;
  }, {});

  const today = startOfTodayUTC();
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today.getTime() + index * 86400000);
    const end = new Date(start.getTime() + 86400000);
    return {
      date: start,
      count: buckets.all.filter((t) => t.dueAt && t.dueAt >= start && t.dueAt < end).length,
    };
  });

  return { statusCounts, nextSevenDays };
}

// ---- Projects -------------------------------------------------------------

export async function getProjectsWithProgress() {
  const [allProjects, projectTasks] = await Promise.all([
    db.query.projects.findMany({
      where: isNull(projects.archivedAt),
      with: { owner: true, workstream: true },
      orderBy: [desc(projects.updatedAt)],
    }),
    db.query.tasks.findMany({ where: isNull(tasks.archivedAt) }),
  ]);

  const today = startOfTodayUTC();
  return allProjects.map((project) => {
    const rows = projectTasks.filter((task) => task.projectId === project.id);
    const done = rows.filter((task) => task.status === "completed").length;
    const overdue = rows.filter((task) => task.dueAt && task.dueAt < today && !["completed", "cancelled"].includes(task.status)).length;
    const blocked = rows.filter((task) => task.status === "blocked").length;
    return {
      ...project,
      taskCount: rows.length,
      tasksDone: done,
      progressPct: rows.length ? Math.round((done / rows.length) * 100) : 0,
      overdueCount: overdue,
      blockedCount: blocked,
    };
  });
}

export async function getProjectWithTasks(projectId: string) {
  const [project, projectTasks, allWorkstreams] = await Promise.all([
    db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: { owner: true, milestones: true, workstream: true },
    }),
    db.query.tasks.findMany({
      where: and(eq(tasks.projectId, projectId), isNull(tasks.archivedAt)),
      with: { owner: true },
      orderBy: [tasks.dueAt, desc(tasks.updatedAt)],
    }),
    getActiveWorkstreams(),
  ]);
  if (!project) return null;
  return { project, tasks: projectTasks, workstreams: allWorkstreams };
}

// ---- Task detail ----------------------------------------------------------

export async function getTaskDetail(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: true,
      owner: true,
      createdBy: true,
      reviewer: true,
      subtasks: { orderBy: [subtasks.sortOrder] },
      comments: { with: { user: true }, orderBy: [comments.createdAt] },
      activity: { with: { user: true }, orderBy: [desc(activityLogs.createdAt)], limit: 50 },
      attachments: true,
    },
  });
}

// ---- All tasks ------------------------------------------------------------

export async function getAllTasks(opts: { limit?: number } = {}) {
  return db.query.tasks.findMany({
    where: isNull(tasks.archivedAt),
    with: { owner: true, project: true },
    orderBy: [desc(tasks.updatedAt)],
    limit: opts.limit ?? 500,
  });
}

export async function getArchive() {
  const [archivedTasks, archivedProjects] = await Promise.all([
    db.query.tasks.findMany({
      where: inArray(tasks.status, ["completed", "cancelled"]),
      with: { owner: true, project: true },
      orderBy: [desc(tasks.completedAt), desc(tasks.updatedAt)],
      limit: 250,
    }),
    db.query.projects.findMany({
      where: inArray(projects.status, ["completed", "cancelled"]),
      with: { owner: true },
      orderBy: [desc(projects.updatedAt)],
    }),
  ]);
  return { tasks: archivedTasks, projects: archivedProjects };
}

// ---- Team -----------------------------------------------------------------

export async function getTeamWorkload() {
  const [members, openTasks] = await Promise.all([
    getActiveUsers(),
    db.query.tasks.findMany({ where: and(isNull(tasks.archivedAt), isOpenStatusSql()) }),
  ]);

  const today = startOfTodayUTC();
  return members.map((member) => {
    const owned = openTasks.filter((task) => task.ownerId === member.id);
    const overdue = owned.filter((task) => task.dueAt && task.dueAt < today).length;
    const blocked = owned.filter((task) => task.status === "blocked").length;
    const highPriority = owned.filter((task) => task.priority === "urgent" || task.priority === "high").length;
    const effortMinutes = owned.reduce((sum, task) => sum + (task.estimatedMinutes ?? 60), 0);
    return { user: member, active: owned.length, overdue, blocked, highPriority, effortMinutes };
  });
}

// ---- Shell / inbox --------------------------------------------------------

export async function getShellData(userId: string) {
  const [unread, buckets] = await Promise.all([
    db.query.notifications.findMany({
      where: and(eq(notifications.userId, userId), eq(notifications.read, false)),
      orderBy: [desc(notifications.createdAt)],
      limit: 8,
    }),
    getMyWorkBuckets(userId),
  ]);

  return {
    unread,
    unreadCount: unread.length,
    myWorkCount: buckets.all.length,
    overdueCount: buckets.overdue.length,
  };
}

export async function getInbox(userId: string) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    with: { task: true },
    orderBy: [desc(notifications.createdAt)],
    limit: 150,
  });
}

// ---- Calendar -------------------------------------------------------------

export async function getCalendarTasks(days = 42) {
  const all = await getAllTasks({ limit: 1000 });
  const today = startOfTodayUTC();
  const end = new Date(today.getTime() + days * 86400000);
  return all.filter((task) => task.dueAt && task.dueAt >= today && task.dueAt < end && !["completed", "cancelled"].includes(task.status));
}

// ---- Saved views ----------------------------------------------------------

export async function getSavedViews(userId: string) {
  return db.query.savedViews.findMany({ where: eq(savedViews.userId, userId), orderBy: [desc(savedViews.pinned), savedViews.name] });
}

// ---- Analytics ------------------------------------------------------------

export async function getAnalyticsSnapshot() {
  const [allTasks, allProjects, members, streams, failedDeliveries] = await Promise.all([
    db.query.tasks.findMany({ where: isNull(tasks.archivedAt), with: { owner: true, project: true } }),
    getProjectsWithProgress(),
    getActiveUsers(),
    getActiveWorkstreams(),
    db.query.notificationDeliveries.findMany({ where: eq(notificationDeliveries.success, false), limit: 100 }),
  ]);

  const now = new Date();
  const today = startOfTodayUTC();
  const open = allTasks.filter((task) => isOpenStatus(task.status));
  const completed = allTasks.filter((task) => task.status === "completed");
  const overdue = open.filter((task) => task.dueAt && task.dueAt < today);
  const blocked = open.filter((task) => task.status === "blocked");
  const waiting = open.filter((task) => task.status === "waiting");
  const onTimeCompleted = completed.filter((task) => task.completedAt && task.originalDueAt && task.completedAt <= task.originalDueAt);

  const statusCounts = ["backlog", "not_started", "in_progress", "waiting", "blocked", "needs_review", "completed"].map((status) => ({
    label: status.replaceAll("_", " "),
    value: allTasks.filter((task) => task.status === status).length,
  }));

  const priorityCounts = ["urgent", "high", "medium", "low"].map((priority) => ({
    label: priority,
    value: open.filter((task) => task.priority === priority).length,
  }));

  const ownerCounts = members.map((member) => ({
    label: member.name.split(" ")[0] || member.name,
    value: open.filter((task) => task.ownerId === member.id).length,
  }));

  const workstreamCounts = streams.map((stream) => ({
    label: stream.name,
    value: open.filter((task) => task.workstreamId === stream.id).length,
  })).filter((row) => row.value > 0);

  const completionTrend = Array.from({ length: 6 }, (_, index) => {
    const end = new Date(now.getTime() - (5 - index) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: completed.filter((task) => task.completedAt && task.completedAt >= start && task.completedAt < end).length,
    };
  });

  const createdVsCompleted = Array.from({ length: 6 }, (_, index) => {
    const end = new Date(now.getTime() - (5 - index) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      created: allTasks.filter((task) => task.createdAt >= start && task.createdAt < end).length,
      completed: completed.filter((task) => task.completedAt && task.completedAt >= start && task.completedAt < end).length,
    };
  });

  return {
    totals: {
      active: open.length,
      completed: completed.length,
      overdue: overdue.length,
      blocked: blocked.length,
      waiting: waiting.length,
      onTimeRate: completed.length ? Math.round((onTimeCompleted.length / completed.length) * 100) : 0,
      failedNotifications: failedDeliveries.length,
    },
    statusCounts,
    priorityCounts,
    ownerCounts,
    workstreamCounts,
    completionTrend,
    createdVsCompleted,
    projects: allProjects,
  };
}
