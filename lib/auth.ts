import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

/**
 * Ayna Tracker is private to the Ayna team.
 * Access is granted only when the signed-in account email ends in
 * @aynahealth.co. No Clerk organization membership or invitation is required.
 */
export const AYNA_EMAIL_DOMAIN = "@aynahealth.co";

export function isAynaEmail(email: string) {
  return email.trim().toLowerCase().endsWith(AYNA_EMAIL_DOMAIN);
}

export async function getAynaClerkUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser?.emailAddresses[0]?.emailAddress
    ?? "";

  if (!isAynaEmail(email)) redirect("/not-authorized");

  return { userId, clerkUser, email: email.trim().toLowerCase() };
}

/**
 * Resolves the signed-in account to the internal Ayna users row.
 * The @aynahealth.co domain check runs every time this helper is used.
 * Internal deactivation remains an additional lock.
 *
 * First login can trigger several server-rendered requests at once. User
 * creation therefore uses ON CONFLICT DO NOTHING and then re-reads the row so
 * concurrent requests cannot crash on the unique Clerk user/email indexes.
 */
export async function getOrCreateCurrentUser() {
  const {
    userId: authProviderId,
    clerkUser,
    email,
  } = await getAynaClerkUser();

  const name = clerkUser
    ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email
    : email;

  const existingByProvider = await db.query.users.findFirst({
    where: eq(users.authProviderId, authProviderId),
  });

  if (existingByProvider) {
    if (!existingByProvider.active) redirect("/not-authorized");

    await db.update(users).set({
      email,
      name: name || existingByProvider.name,
      image: clerkUser?.imageUrl ?? existingByProvider.image,
      updatedAt: new Date(),
    }).where(eq(users.id, existingByProvider.id));

    return db.query.users.findFirst({ where: eq(users.id, existingByProvider.id) });
  }

  const existingByEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existingByEmail) {
    if (!existingByEmail.active) redirect("/not-authorized");

    await db.update(users).set({
      authProviderId,
      name: name || existingByEmail.name,
      image: clerkUser?.imageUrl ?? existingByEmail.image,
      updatedAt: new Date(),
    }).where(eq(users.id, existingByEmail.id));

    return db.query.users.findFirst({ where: eq(users.id, existingByEmail.id) });
  }

  let workspace = (await db.query.workspaces.findMany({ limit: 1 }))[0];
  const isFirstUser = !workspace;
  if (!workspace) {
    const id = nanoid();
    await db.insert(workspaces).values({ id, name: "Ayna" }).onConflictDoNothing();
    workspace = (await db.query.workspaces.findMany({ limit: 1 }))[0];
    if (!workspace) throw new Error("Unable to initialize Ayna workspace");
  }

  const id = nanoid();
  await db.insert(users).values({
    id,
    workspaceId: workspace.id,
    authProviderId,
    email,
    name,
    image: clerkUser?.imageUrl,
    role: isFirstUser ? "admin" : "member",
  }).onConflictDoNothing();

  // Another request may have created this exact user between the checks above
  // and the insert. Always resolve the canonical row after the insert attempt.
  const resolvedByProvider = await db.query.users.findFirst({
    where: eq(users.authProviderId, authProviderId),
  });
  if (resolvedByProvider) {
    if (!resolvedByProvider.active) redirect("/not-authorized");
    return resolvedByProvider;
  }

  const resolvedByEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (resolvedByEmail) {
    if (!resolvedByEmail.active) redirect("/not-authorized");

    // Covers a rare concurrent email-linking race without creating a duplicate.
    if (resolvedByEmail.authProviderId !== authProviderId) {
      await db.update(users).set({
        authProviderId,
        name: name || resolvedByEmail.name,
        image: clerkUser?.imageUrl ?? resolvedByEmail.image,
        updatedAt: new Date(),
      }).where(eq(users.id, resolvedByEmail.id));
    }

    return db.query.users.findFirst({ where: eq(users.id, resolvedByEmail.id) });
  }

  throw new Error("Unable to resolve Ayna user after sign in");
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
