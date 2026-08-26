"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { trackerItems, trackers } from "@/db/tracker-schema";
import { requireEditPermission } from "@/lib/auth";
import { createTaskQuick } from "@/lib/actions/tasks";

const templates = {
  partnerships: {
    itemLabel: "Brand",
    stages: [
      ["new", "New"],
      ["contacted", "Contacted"],
      ["replied", "Replied"],
      ["meeting", "Meeting"],
      ["negotiating", "Negotiating"],
      ["contract", "Contract"],
      ["active", "Active"],
      ["closed", "Closed"],
    ],
  },
  influencers: {
    itemLabel: "Influencer",
    stages: [
      ["prospect", "Prospect"],
      ["contacted", "Contacted"],
      ["replied", "Replied"],
      ["negotiating", "Negotiating"],
      ["confirmed", "Confirmed"],
      ["posted", "Posted"],
      ["complete", "Complete"],
    ],
  },
  general: {
    itemLabel: "Item",
    stages: [
      ["new", "New"],
      ["in_progress", "In progress"],
      ["waiting", "Waiting"],
      ["done", "Done"],
    ],
  },
} as const;

const templateSchema = z.enum(["partnerships", "influencers", "general"]);

function stageJson(template: keyof typeof templates) {
  return JSON.stringify(templates[template].stages.map(([key, label]) => ({ key, label })));
}

export async function createTracker(input: { name: string; description?: string; template?: keyof typeof templates }) {
  const user = await requireEditPermission();
  const name = z.string().trim().min(1).max(120).parse(input.name);
  const template = templateSchema.parse(input.template ?? "general");
  const id = nanoid();

  await db.insert(trackers).values({
    id,
    workspaceId: user.workspaceId,
    name,
    description: input.description?.trim() || undefined,
    itemLabel: templates[template].itemLabel,
    stages: stageJson(template),
  });

  revalidatePath("/trackers");
  return id;
}

export async function archiveTracker(trackerId: string) {
  await requireEditPermission();
  await db.update(trackers).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(trackers.id, trackerId));
  revalidatePath("/trackers");
}

export async function createTrackerItem(input: {
  trackerId: string;
  title: string;
  stage: string;
  ownerId?: string;
  contactName?: string;
  contactEmail?: string;
}) {
  const user = await requireEditPermission();
  const title = z.string().trim().min(1).max(300).parse(input.title);
  const tracker = await db.query.trackers.findFirst({ where: eq(trackers.id, input.trackerId) });
  if (!tracker) throw new Error("Tracker not found");

  const id = nanoid();
  await db.insert(trackerItems).values({
    id,
    trackerId: input.trackerId,
    title,
    stage: input.stage,
    ownerId: input.ownerId || user.id,
    contactName: input.contactName?.trim() || undefined,
    contactEmail: input.contactEmail?.trim().toLowerCase() || undefined,
    actionState: "no_next_step",
  });

  revalidatePath("/trackers");
  revalidatePath(`/trackers/${input.trackerId}`);
  return id;
}

const actionStateSchema = z.enum(["none", "needs_reply", "follow_up", "waiting", "meeting_scheduled", "no_next_step"]);

export async function updateTrackerItem(input: {
  itemId: string;
  trackerId: string;
  stage?: string;
  actionState?: z.infer<typeof actionStateSchema>;
  ownerId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  nextAction?: string | null;
  followupAt?: string | null;
  lastContactAt?: string | null;
  notes?: string | null;
}) {
  await requireEditPermission();
  if (input.actionState) actionStateSchema.parse(input.actionState);

  const patch: Partial<typeof trackerItems.$inferInsert> = { updatedAt: new Date() };
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.actionState !== undefined) patch.actionState = input.actionState;
  if (input.ownerId !== undefined) patch.ownerId = input.ownerId;
  if (input.contactName !== undefined) patch.contactName = input.contactName?.trim() || null;
  if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail?.trim().toLowerCase() || null;
  if (input.nextAction !== undefined) patch.nextAction = input.nextAction?.trim() || null;
  if (input.followupAt !== undefined) patch.followupAt = input.followupAt ? new Date(input.followupAt) : null;
  if (input.lastContactAt !== undefined) patch.lastContactAt = input.lastContactAt ? new Date(input.lastContactAt) : null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

  await db.update(trackerItems).set(patch).where(eq(trackerItems.id, input.itemId));
  revalidatePath("/trackers");
  revalidatePath(`/trackers/${input.trackerId}`);
}

export async function archiveTrackerItem(itemId: string, trackerId: string) {
  await requireEditPermission();
  await db.update(trackerItems).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(trackerItems.id, itemId));
  revalidatePath("/trackers");
  revalidatePath(`/trackers/${trackerId}`);
}

export async function createTrackerFollowupTask(input: { itemId: string; trackerId: string }) {
  const user = await requireEditPermission();
  const item = await db.query.trackerItems.findFirst({ where: eq(trackerItems.id, input.itemId) });
  if (!item) throw new Error("Tracker item not found");

  const result = await createTaskQuick({
    title: item.nextAction?.trim() || `Follow up with ${item.title}`,
    ownerId: item.ownerId ?? user.id,
    dueAt: item.followupAt?.toISOString(),
    status: "not_started",
    priority: item.actionState === "follow_up" || item.actionState === "needs_reply" ? "high" : "medium",
  });

  await db.update(trackerItems).set({
    actionState: "waiting",
    updatedAt: new Date(),
  }).where(eq(trackerItems.id, item.id));

  revalidatePath(`/trackers/${input.trackerId}`);
  return result.id;
}
