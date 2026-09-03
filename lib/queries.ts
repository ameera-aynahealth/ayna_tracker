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
  taskReviewers,
  tasks,
  users,
  workstreams,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { startOfTodayUTC, OPEN_STATUS_LIST } from "@/lib/date-utils";
import { ensureTaskPeopleSchema } from "@/lib/ensure-task-people";

export { startOfTodayUTC };

const OPEN_STATUSES = OPEN_STATUS_LIST;
type OpenTaskStatus = (typeof OPEN_STATUS_LIST)[number];
type ProjectClosedStatus = "completed" | "cancelled";

export function isOpenStatus(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

function isOpenStatusSql() {
  return inArray(tasks.status, OPEN_STATUSES as unknown as OpenTaskStatus[]);
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

// ---------------------------------------------------------------------------
// My Work is the source of truth for personal workload. It includes primary
// ownership, additional assignment, review responsibility, and collaboration.
// ---------------------------------------------------------------------------
export async function getMyWorkBuckets(userId: string) {
  await ensureTaskPeopleSchema();
  const [member, collaborationRows, reviewerRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.select({ taskId: taskCollaborators.taskId }).from(taskCollaborators).where(eq(taskCollaborators.userId, userId)),
    db.select({ taskId: taskReviewers.taskId }).from(taskReviewers).where(eq(taskReviewers.userId, userId)),
  ]);

  const today = startOfTodayUTC(member?.timezone ?? "America/New_York");
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfterTomorrow = new Date(today.getTime() + 2 * 86400000);
  const sevenDays = new Date(today.getTime() + 7 * 86400000);
  const collaboratorIds = collaborationRows.map((row) => row.taskId);
  const reviewerTaskIds = reviewerRows.map((row) => row.taskId);
  const relatedIds = [...new Set([...collaboratorIds, ...reviewerTaskIds])];

  const ownership = relatedIds.length > 0
    ? or(eq(tasks.ownerId, userId), eq(tasks.reviewerId, userId), inArray(tasks.id, relatedIds))
    : or(eq(tasks.ownerId, userId), eq(tasks.reviewerId, userId));

  const rows = await db.query.tasks.findMany({
    where: and(ownership, isNull(tasks.archivedAt), isOpenStatusSql()),
    with: { project: true, owner: true },
    orderBy: [tasks.dueAt, desc(tasks.updatedAt)],
  });

  const reviewerTaskIdSet = new Set(reviewerTaskIds);
  const overdue = rows.filter((task) => task.dueAt && task.dueAt < today && task.status !== "waiting" && task.status !== "blocked");
  const dueToday = rows.filter((task) => task.dueAt && task.dueAt >= today && task.dueAt < tomorrow);
  const dueTomorrow = rows.filter((task) => task.dueAt && task.dueAt >= tomorrow && task.dueAt < dayAfterTomorrow);
  const thisWeek = rows.filter((task) => task.dueAt && task.dueAt >= dayAfterTomorrow && task.dueAt < sevenDays);
  const waiting = rows.filter((task) => task.status === "waiting");
  const blocked = rows.filter((task) => task.status === "blocked");
  const needsReview = rows.filter((task) =>
    task.status === "needs_review" && (task.reviewerId === userId || reviewerTaskIdSet.has(task.id))
  );
  const noDueDate = rows.filter((task) => !task.dueAt && !["waiting", "blocked", "needs_review"].includes(task.status));

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

function priorityScore(task: { dueAt: Date | null; priority: string; status: string }) {
  const today = startOfTodayUTC();
  let score = 0;
  if (task.dueAt && task.dueAt < today) score += 100;
  if (task.priority === "urgent") score += 55;
  if (task.dueAt && task.dueAt >= today && task.dueAt < new Date(today.getTime() + 86400000)) score += 40;
  if (task.priority === "high") score += 22;
  if (task.status === "blocked") score += 18;
  if (task.status === "needs_review") score += 16;
  if (task.status === "waiting") score -= 8;
  return score;
}

export async function getDashboardVisuals(userId: string) {
  const buckets = await getMyWorkBuckets(userId);
  const statusCounts = OPEN_STATUS_LIST.reduce<Record<string, number>>((result, status) => {
    result[status] = buckets.all.filter((task) => task.status === status).length;
    return result;
  }, {});
  const today = startOfTodayUTC();
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today.getTime() + index * 86400000);
    const end = new Date(start.getTime() + 86400000);
    return {
      date: start,
      count: buckets.all.filter((task) => task.dueAt && task.dueAt >= start && task.dueAt < end).length,
    };
  });
  return { statusCounts, nextSevenDays };
}

// ---------------------------------------------------------------------------
// Projects. Counts are calculated from one task fetch to avoid the old N+1
// query behavior where every project triggered another round trip.
// ---------------------------------------------------------------------------
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

export async function getTaskDetail(taskId: string) {
  await ensureTaskPeopleSchema();
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: true,
      owner: true,
      createdBy: true,
      reviewer: true,
      collaborators: { with: { user: true } },
      reviewers: { with: { user: true } },
      subtasks: { orderBy: [subtasks.sortOrder] },
      comments: { with: { user: true }, orderBy: [comments.createdAt] },
      activity: { with: { user: true }, orderBy: [desc(activityLogs.createdAt)], limit: 50 },
      attachments: true,
    },
  });
}

export async function getAllTasks(options: { limit?: number } = {}) {
  return db.query.tasks.findMany({
    where: isNull(tasks.archivedAt),
    with: { owner: true, project: true },
    orderBy: [desc(tasks.updatedAt)],
    limit: options.limit ?? 500,
  });
}

export async function getArchive() {
  const closedTaskStatuses = ["completed", "cancelled"] as const;
  const closedProjectStatuses = ["completed", "cancelled"] as const;
  const [archivedTasks, archivedProjects] = await Promise.all([
    db.query.tasks.findMany({
      where: inArray(tasks.status, closedTaskStatuses as unknown as ("completed" | "cancelled")[]),
      with: { owner: true, project: true },
      orderBy: [desc(tasks.completedAt), desc(tasks.updatedAt)],
      limit: 250,
    }),
    db.query.projects.findMany({
      where: inArray(projects.status, closedProjectStatuses as unknown as ProjectClosedStatus[]),
      with: { owner: true },
      orderBy: [desc(projects.updatedAt)],
    }),
  ]);
  return { tasks: archivedTasks, projects: archivedProjects };
}

export async function getTeamWorkload() {
  const [members, openTasks, collaboratorRows] = await Promise.all([
    getActiveUsers(),
    db.query.tasks.findMany({ where: and(isNull(tasks.archivedAt), isOpenStatusSql()) }),
    db.select({ taskId: taskCollaborators.taskId, userId: taskCollaborators.userId }).from(taskCollaborators),
  ]);
  const today = startOfTodayUTC();
  return members.map((member) => {
    const collaboratorTaskIds = new Set(
      collaboratorRows.filter((row) => row.userId === member.id).map((row) => row.taskId)
    );
    const assigned = openTasks.filter((task) => task.ownerId === member.id || collaboratorTaskIds.has(task.id));
    const overdue = assigned.filter((task) => task.dueAt && task.dueAt < today).length;
    const blocked = assigned.filter((task) => task.status === "blocked").length;
    const highPriority = assigned.filter((task) => task.priority === "urgent" || task.priority === "high").length;
    const effortMinutes = assigned.reduce((sum, task) => sum + (task.estimatedMinutes ?? 60), 0);
    return { user: member, active: assigned.length, overdue, blocked, highPriority, effortMinutes };
  });
}

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
    orderBy: [desc(notifications.createdAt)],
    limit: 150,
  });
}

export async function getCalendarTasks(days = 42) {
  const all = await getAllTasks({ limit: 1000 });
  const today = startOfTodayUTC();
  const end = new Date(today.getTime() + days * 86400000);
  return all.filter((task) => task.dueAt && task.dueAt >= today && task.dueAt < end && !["completed", "cancelled"].includes(task.status));
}

export async function getSavedViews(userId: string) {
  return db.query.savedViews.findMany({
    where: eq(savedViews.userId, userId),
    orderBy: [desc(savedViews.pinned), savedViews.name],
  });
}

export async function getAnalyticsSnapshot() {
  const [allTasks, allProjects, members, streams, failedDeliveries, collaboratorRows] = await Promise.all([
    db.query.tasks.findMany({ where: isNull(tasks.archivedAt), with: { owner: true, project: true } }),
    getProjectsWithProgress(),
    getActiveUsers(),
    getActiveWorkstreams(),
    db.query.notificationDeliveries.findMany({ where: eq(notificationDeliveries.success, false), limit: 100 }),
    db.select({ taskId: taskCollaborators.taskId, userId: taskCollaborators.userId }).from(taskCollaborators),
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
    value: open.filter((task) =>
      task.ownerId === member.id || collaboratorRows.some((row) => row.taskId === task.id && row.userId === member.id)
    ).length,
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

// A non-destructive data-health summary for admins. This intentionally flags
// likely problems instead of silently deleting or merging existing Ayna data.
export async function getDataHealthSnapshot() {
  const all = await db.query.tasks.findMany({ where: isNull(tasks.archivedAt) });
  const activeUserIds = new Set((await getActiveUsers()).map((user) => user.id));
  const normalizedTitles = new Map<string, string[]>();
  for (const task of all) {
    const normalized = task.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const ids = normalizedTitles.get(normalized) ?? [];
    ids.push(task.id);
    normalizedTitles.set(normalized, ids);
  }
  const duplicateGroups = [...normalizedTitles.values()].filter((ids) => ids.length > 1);
  const malformedTitles = all.filter((task) => {
    const words = task.title.toLowerCase().trim().split(/\s+/);
    if (words.length < 4) return false;
    const half = Math.floor(words.length / 2);
    return words.slice(0, half).join(" ") === words.slice(half, half * 2).join(" ");
  });
  return {
    possibleDuplicateGroups: duplicateGroups.length,
    possibleDuplicateTasks: duplicateGroups.reduce((sum, group) => sum + group.length, 0),
    missingOwner: all.filter((task) => !task.ownerId).length,
    missingDueDate: all.filter((task) => isOpenStatus(task.status) && !task.dueAt).length,
    inactiveOwner: all.filter((task) => task.ownerId && !activeUserIds.has(task.ownerId)).length,
    malformedTitles: malformedTitles.length,
  };
}
