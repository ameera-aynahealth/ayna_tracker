"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) return;
  await db.update(notifications).set({ read: true }).where(
    and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)),
  );
  revalidatePath("/inbox");
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const user = await getOrCreateCurrentUser();
  if (!user) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/inbox");
  revalidatePath("/");
}
