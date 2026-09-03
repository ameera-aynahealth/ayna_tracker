import { relations } from "drizzle-orm";
import {
  activityLogs,
  attachments,
  milestones,
  projects,
  taskCollaborators,
  taskReviewers,
  taskTags,
  tasks,
  tags,
  users,
} from "./schema";

// Extra reverse relations required by Drizzle's relational query builder.
// The base schema defines several `many(...)` relations; Drizzle also needs
// the matching `one(...)` side so it can infer the join path at runtime.

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  uploadedBy: one(users, {
    fields: [attachments.uploadedById],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [activityLogs.taskId],
    references: [tasks.id],
  }),
  project: one(projects, {
    fields: [activityLogs.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const taskCollaboratorsRelations = relations(taskCollaborators, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCollaborators.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskCollaborators.userId],
    references: [users.id],
  }),
}));

export const taskReviewersRelations = relations(taskReviewers, ({ one }) => ({
  task: one(tasks, {
    fields: [taskReviewers.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskReviewers.userId],
    references: [users.id],
  }),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));
