"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateCurrentUser, requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const preferencesSchema = z.object({
  notifyOnAssigned: z.boolean(),
  notifyOnMentioned: z.boolean(),
  notifyOnDueSoon: z.boolean(),
  notifyOnOverdue: z.boolean(),
  notifyOnReviewRequested: z.boolean(),
  notifyOnBlocked: z.boolean(),
  notifyOnComment: z.boolean(),
  dailyDigest: z.boolean(),
  weeklyDigest: z.boolean(),
});

export async function updateNotificationPreferences(input: z.infer<typeof preferencesSchema>) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("Not signed in");
  const values = preferencesSchema.parse(input);
  await db.update(users).set({ ...values, updatedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath("/settings");
}

export async function updateInternalMemberRole(userId: string, role: "admin" | "member" | "viewer") {
  const admin = await requireAdmin();
  if (admin.id === userId && role !== "admin") throw new Error("You cannot remove your own admin access here");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/settings");
  revalidatePath("/team");
}

export async function setMemberActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId && !active) throw new Error("You cannot deactivate yourself");
  await db.update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/settings");
  revalidatePath("/team");
}
