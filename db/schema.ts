import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums — canonical values only. This is the single source of truth for
// status/priority/role/health across the whole app (spec section 160, 103).
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "member", "viewer"]);

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
  "needs_review",
  "completed",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "urgent",
  "high",
  "medium",
  "low",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "task",
  "follow_up",
  "meeting_action_item",
  "approval",
  "deliverable",
  "bug",
  "content",
  "partnership",
  "administrative",
  "milestone",
  "research",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "at_risk",
  "blocked",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectHealthEnum = pgEnum("project_health", [
  "on_track",
  "needs_attention",
  "at_risk",
  "blocked",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "assigned",
  "mentioned",
  "due_soon",
  "overdue",
  "review_requested",
  "comment",
  "blocked",
  "unblocked",
  "project_update",
  "daily_digest",
  "weekly_digest",
]);

// ---------------------------------------------------------------------------
// Workspace — single-workspace for now (Ayna), but modeled so multi-workspace
// is possible later without a schema rewrite.
// ---------------------------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  defaultDueTime: text("default_due_time").notNull().default("17:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users — synced from Clerk on sign-in. authProviderId links to Clerk's
// user id. Never trust role from the client; always read from here.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    authProviderId: text("auth_provider_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("member"),
    timezone: text("timezone").notNull().default("America/New_York"),
    active: boolean("active").notNull().default(true),
    notifyOnAssigned: boolean("notify_on_assigned").notNull().default(true),
    notifyOnMentioned: boolean("notify_on_mentioned").notNull().default(true),
    notifyOnDueSoon: boolean("notify_on_due_soon").notNull().default(true),
    notifyOnOverdue: boolean("notify_on_overdue").notNull().default(true),
    notifyOnReviewRequested: boolean("notify_on_review_requested").notNull().default(true),
    notifyOnBlocked: boolean("notify_on_blocked").notNull().default(true),
    notifyOnComment: boolean("notify_on_comment").notNull().default(true),
    dailyDigest: boolean("daily_digest").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    authProviderIdx: uniqueIndex("users_auth_provider_id_idx").on(t.authProviderId),
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  })
);

// ---------------------------------------------------------------------------
// Workstreams
// ---------------------------------------------------------------------------

export const workstreams = pgTable("workstreams", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    name: text("name").notNull(),
    description: text("description"),
    objective: text("objective"),
    ownerId: text("owner_id").references(() => users.id),
    workstreamId: text("workstream_id").references(() => workstreams.id),
    status: projectStatusEnum("status").notNull().default("planning"),
    health: projectHealthEnum("health").notNull().default("on_track"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    color: text("color").default("#A8532B"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("projects_workspace_idx").on(t.workspaceId),
    statusIdx: index("projects_status_idx").on(t.status),
  })
);

// ---------------------------------------------------------------------------
// Tasks — the core object. Denormalized-safe fields for overdue/waiting logic
// live directly on the row so query logic stays centralized (spec 51, 160).
// ---------------------------------------------------------------------------

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    parentTaskId: text("parent_task_id"),
    workstreamId: text("workstream_id").references(() => workstreams.id),

    title: text("title").notNull(),
    description: text("description"),

    status: taskStatusEnum("status").notNull().default("not_started"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    taskType: taskTypeEnum("task_type").notNull().default("task"),

    ownerId: text("owner_id").references(() => users.id),
    createdById: text("created_by_id").notNull().references(() => users.id),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewRequired: boolean("review_required").notNull().default(false),

    startAt: timestamp("start_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    dueTimezone: text("due_timezone").default("America/New_York"),
    estimatedMinutes: integer("estimated_minutes"),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedById: text("completed_by_id").references(() => users.id),
    originalDueAt: timestamp("original_due_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    recurrenceRule: text("recurrence_rule"),

    // "Waiting on someone" — spec section 10.
    waitingOnName: text("waiting_on_name"),
    waitingOnOrg: text("waiting_on_org"),
    waitingSince: timestamp("waiting_since", { withTimezone: true }),
    followupAt: timestamp("followup_at", { withTimezone: true }),
    waitingNotes: text("waiting_notes"),
    waitingLinkUrl: text("waiting_link_url"),

    // Blocked — spec section 37.
    blockedReason: text("blocked_reason"),
    blockedById: text("blocked_by_id"),
    blockedSince: timestamp("blocked_since", { withTimezone: true }),
    nextCheckInAt: timestamp("next_check_in_at", { withTimezone: true }),

    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),

    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerStatusIdx: index("tasks_owner_status_idx").on(t.ownerId, t.status),
    dueAtIdx: index("tasks_due_at_idx").on(t.dueAt),
    projectIdx: index("tasks_project_idx").on(t.projectId),
    statusIdx: index("tasks_status_idx").on(t.status),
    workspaceIdx: index("tasks_workspace_idx").on(t.workspaceId),
    createdAtIdx: index("tasks_created_at_idx").on(t.createdAt),
  })
);

// Task <-> collaborators (many-to-many)
export const taskCollaborators = pgTable(
  "task_collaborators",
  {
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.taskId, t.userId] }) })
);

// Subtasks / checklist items
export const subtasks = pgTable(
  "subtasks",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    ownerId: text("owner_id").references(() => users.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ taskIdx: index("subtasks_task_idx").on(t.taskId) })
);

// Dependencies: taskId is "blocked by" blockingTaskId
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    blockingTaskId: text("blocking_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ taskIdx: index("deps_task_idx").on(t.taskId) })
);

// Comments
export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ taskIdx: index("comments_task_idx").on(t.taskId) })
);

// Tags + join table
export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.taskId, t.tagId] }) })
);

// Attachments (links only for phase 1 — file upload via Vercel Blob is phase 2/5)
export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
    kind: text("kind").notNull().default("link"), // 'file' | 'link'
    name: text("name").notNull(),
    url: text("url").notNull(),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ taskIdx: index("attachments_task_idx").on(t.taskId) })
);

// Milestones
export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Activity log — append-only, never overwritten (spec 13, 177)
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    action: text("action").notNull(),
    field: text("field"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("activity_task_idx").on(t.taskId),
    projectIdx: index("activity_project_idx").on(t.projectId),
  })
);

// Notifications (in-app)
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("notifications_user_idx").on(t.userId, t.read) })
);

// Notification deliveries — dedupe key is the source of truth for "already sent"
export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey(),
    dedupeKey: text("dedupe_key").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    destinationEmail: text("destination_email").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    success: boolean("success").notNull().default(false),
    failureMessage: text("failure_message"),
  },
  (t) => ({
    dedupeIdx: uniqueIndex("delivery_dedupe_idx").on(t.dedupeKey),
  })
);

// Saved views
export const savedViews = pgTable("saved_views", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  filters: text("filters").notNull(), // JSON-encoded filter state
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  ownedTasks: many(tasks, { relationName: "owner" }),
  createdTasks: many(tasks, { relationName: "creator" }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  tasks: many(tasks),
  milestones: many(milestones),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  workstream: one(workstreams, { fields: [projects.workstreamId], references: [workstreams.id] }),
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  owner: one(users, { fields: [tasks.ownerId], references: [users.id], relationName: "owner" }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id], relationName: "creator" }),
  reviewer: one(users, { fields: [tasks.reviewerId], references: [users.id] }),
  subtasks: many(subtasks),
  comments: many(comments),
  collaborators: many(taskCollaborators),
  tags: many(taskTags),
  attachments: many(attachments),
  activity: many(activityLogs),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));
