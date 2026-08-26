import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

/**
 * Resolves the signed-in Clerk user to our internal `users` row, creating it
 * (and the single workspace, if missing) on first sign-in. This is the ONLY
 * place role/permissions should be read from — never trust a role passed
 * from the client.
 */
export async function getOrCreateCurrentUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const existing = await db.query.users.findFirst({
    where: eq(users.authProviderId, authProviderId),
  });
  if (existing) return existing;

  // First sign-in: ensure a workspace exists, then create the user record.
  // The very first person to sign in becomes admin.
  let workspace = (await db.query.workspaces.findMany({ limit: 1 }))[0];
  const isFirstUser = !workspace;
  if (!workspace) {
    const id = nanoid();
    await db.insert(workspaces).values({ id, name: "Ayna" });
    workspace = { id, name: "Ayna", timezone: "America/New_York", defaultDueTime: "17:00", createdAt: new Date(), updatedAt: new Date() };
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const name = clerkUser ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email : email;

  const id = nanoid();
  await db.insert(users).values({
    id,
    workspaceId: workspace.id,
    authProviderId,
    email,
    name,
    image: clerkUser?.imageUrl,
    role: isFirstUser ? "admin" : "member",
  });

  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function requireAdmin() {
  const user = await getOrCreateCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}

export async function requireEditPermission() {
  const user = await getOrCreateCurrentUser();
  if (!user || user.role === "viewer") {
    throw new Error("Forbidden: viewers cannot modify records");
  }
  return user;
}
