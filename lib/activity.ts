import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { nanoid } from "nanoid";

export async function logActivity(entry: {
  taskId?: string;
  projectId?: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await db.insert(activityLogs).values({
    id: nanoid(),
    taskId: entry.taskId,
    projectId: entry.projectId,
    userId: entry.userId,
    action: entry.action,
    field: entry.field,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
  });
}
