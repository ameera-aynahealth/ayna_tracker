import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users, workspaces } from "./schema";

export const trackers = pgTable(
  "trackers",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    name: text("name").notNull(),
    description: text("description"),
    itemLabel: text("item_label").notNull().default("Item"),
    stages: text("stages").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ workspaceIdx: index("trackers_workspace_idx").on(t.workspaceId) })
);

export const trackerItems = pgTable(
  "tracker_items",
  {
    id: text("id").primaryKey(),
    trackerId: text("tracker_id").notNull().references(() => trackers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    stage: text("stage").notNull(),
    actionState: text("action_state").notNull().default("none"),
    ownerId: text("owner_id").references(() => users.id),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    nextAction: text("next_action"),
    followupAt: timestamp("followup_at", { withTimezone: true }),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trackerIdx: index("tracker_items_tracker_idx").on(t.trackerId),
    ownerIdx: index("tracker_items_owner_idx").on(t.ownerId),
    followupIdx: index("tracker_items_followup_idx").on(t.followupAt),
  })
);

export const trackersRelations = relations(trackers, ({ many }) => ({
  items: many(trackerItems),
}));

export const trackerItemsRelations = relations(trackerItems, ({ one }) => ({
  tracker: one(trackers, { fields: [trackerItems.trackerId], references: [trackers.id] }),
  owner: one(users, { fields: [trackerItems.ownerId], references: [users.id] }),
}));
