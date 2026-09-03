import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { attachments } from "./schema";

// File bytes are kept outside the normal attachment row so task pages only
// carry a short download URL instead of a multi-megabyte data URL.
export const attachmentFiles = pgTable("attachment_files", {
  attachmentId: text("attachment_id")
    .primaryKey()
    .references(() => attachments.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
