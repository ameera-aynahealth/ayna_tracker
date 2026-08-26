import { db } from "@/db";
import { tasks, projects, users, subtasks, comments, activityLogs, taskDependencies } from "@/db/schema";
import { and, eq, gte, lt, lte, isNull, isNotNull, or, ne, desc, inArray, sql } from "drizzle-orm";
import { startOfTodayUTC, OPEN_STATUS_LIST } from "@/lib/date-utils";

export { startOfTodayUTC };

// ---------------------------------------------------------------------------
// This file is the single source of truth for "what counts as overdue",
// "what counts as due today", etc. Every page (Home, My Work, All Tasks,
// Projects, Analytics) must call through these functions rather than
// re-implementing the date math, so counts always agree with each other
// (spec section 109, 159, 160).
// ---------------------------------------------------------------------------

const OPEN_STATUSES = OPEN_STATUS_LIST;

export function isOpenStatus(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

export async function getWorkspace() {
  const rows = await db.query.workspaces.findMany({ limit: 1 });
  return rows[0] ?? null;
}

export async function getCurrentUserRecord(authProviderId: string) {
  return db.query.users.findFirst({ where: eq(users.authProviderId, authProviderId) });
}

// ---- My Work buckets -------------------------------------------------------

export async function getMyWorkBuckets(userId: string) {
  const today = startOfTodayUTC();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(today.getTime() + (7 - today.getDay()) * 24 * 60 * 60 * 1000);

  const rows = await db.query.tasks.findMany({
    where: and(eq(tasks.ownerId, userId), isNull(tasks.archivedAt), isOpenStatusSql()),
    with: { project: true },
    orderBy: [tasks.dueAt],
  });

  const overdue = rows.filter((t) => t.dueAt && t.dueAt < today && t.status !== "waiting" && t.status !== "blocked");
  const dueToday = rows.filter((t) => t.dueAt && t.dueAt >= today && t.dueAt < tomorrow);
  const dueTomorrow = rows.filter((t) => t.dueAt && t.dueAt >= tomorrow && t.dueAt < new Date(tomorrow.getTime() + 86400000));
  const thisWeek = rows.filter((t) => t.dueAt && t.dueAt >= new Date(tomorrow.getTime() + 86400000) && t.dueAt < endOfWeek);
  const waiting = rows.filter((t) => t.status === "waiting");
  const blocked = rows.filter((t) => t.status === "blocked");
  const needsReview = rows.filter((t) => t.status === "needs_review");
  const noDueDate = rows.filter((t) => !t.dueAt && t.status !== "waiting" && t.status !== "blocked" && t.status !== "needs_review");

  return { overdue, dueToday, dueTomorrow, thisWeek, waiting, blocked, needsReview, noDueDate, all: rows };
}

type TaskStatus = "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed" | "cancelled";

function isOpenStatusSql() {
  return inArray(tasks.status, OPEN_STATUSES as unknown as TaskStatus[]);
}

// ---- Home dashboard ---------------------------------------------------------

export async function getHomeSummary(userId: string) {
  const buckets = await getMyWorkBuckets(userId);
  return {
    overdue: buckets.overdue.length,
    dueToday: buckets.dueToday.length,
    dueThisWeek: buckets.dueToday.length + buckets.dueTomorrow.length + buckets.thisWeek.length,
    blocked: buckets.blocked.length,
    waiting: buckets.waiting.length,
    needsReview: buckets.needsReview.length,
  };
}

// Ranks a user's open tasks for "what should I work on next" (spec 15, 139).
export async function getTopPriorities(userId: string, limit = 5) {
  const buckets = await getMyWorkBuckets(userId);
  const scored = buckets.all
    .filter((t) => t.status !== "completed" && t.status !== "cancelled")
    .map((t) => ({ task: t, score: priorityScore(t) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.task);
}

function priorityScore(t: { dueAt: Date | null; priority: string; status: string }) {
  const today = startOfTodayUTC();
  let score = 0;
  if (t.dueAt && t.dueAt < today) score += 100;
  if (t.priority === "urgent") score += 50;
  if (t.dueAt && t.dueAt >= today && t.dueAt < new Date(today.getTime() + 86400000)) score += 40;
  if (t.priority === "high") score += 20;
  if (t.status === "blocked") score += 15;
  return score;
}

// ---- Projects ----------------------------------------------------------------

export async function getProjectsWithProgress() {
  const allProjects = await db.query.projects.findMany({
    where: isNull(projects.archivedAt),
    with: { owner: true },
    orderBy: [desc(projects.updatedAt)],
  });

  const results = [];
  for (const p of allProjects) {
    const projectTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.projectId, p.id), isNull(tasks.archivedAt)),
    });
    const total = projectTasks.length;
    const done = projectTasks.filter((t) => t.status === "completed").length;
    const today = startOfTodayUTC();
    const overdue = projectTasks.filter(
      (t) => t.dueAt && t.dueAt < today && t.status !== "completed" && t.status !== "cancelled"
    ).length;
    const blocked = projectTasks.filter((t) => t.status === "blocked").length;
    results.push({
      ...p,
      taskCount: total,
      tasksDone: done,
      progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
      overdueCount: overdue,
      blockedCount: blocked,
    });
  }
  return results;
}

export async function getProjectWithTasks(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { owner: true, milestones: true },
  });
  if (!project) return null;
  const projectTasks = await db.query.tasks.findMany({
    where: and(eq(tasks.projectId, projectId), isNull(tasks.archivedAt)),
    with: { owner: true },
    orderBy: [tasks.dueAt],
  });
  return { project, tasks: projectTasks };
}

// ---- Single task with everything the detail panel needs --------------------

export async function getTaskDetail(taskId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: true,
      owner: true,
      createdBy: true,
      reviewer: true,
      subtasks: { orderBy: [subtasks.sortOrder] },
      comments: { with: { user: true }, orderBy: [comments.createdAt] },
      activity: { with: { user: true }, orderBy: [desc(activityLogs.createdAt)], limit: 50 },
    },
  });
  return task;
}

// ---- All tasks table ---------------------------------------------------------

export async function getAllTasks(opts: { limit?: number } = {}) {
  return db.query.tasks.findMany({
    where: isNull(tasks.archivedAt),
    with: { owner: true, project: true },
    orderBy: [desc(tasks.updatedAt)],
    limit: opts.limit ?? 200,
  });
}

// ---- Team workload -------------------------------------------------------

export async function getTeamWorkload() {
  const members = await db.query.users.findMany({ where: eq(users.active, true) });
  const result = [];
  for (const m of members) {
    const buckets = await getMyWorkBuckets(m.id);
    result.push({
      user: m,
      active: buckets.all.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
      overdue: buckets.overdue.length,
    });
  }
  return result;
}
