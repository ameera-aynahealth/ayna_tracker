import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

/**
 * Ayna Tracker is invite-only and single-organization.
 * A Google/Clerk account by itself is never enough to enter the tracker:
 * the signed-in Clerk user must be an active member of this exact Ayna org.
 */
export const AYNA_CLERK_ORG_ID =
  process.env.CLERK_ORGANIZATION_ID ?? "org_3IRENjCjH7Ag660gEUrxgk1xZ4O";

export async function getAynaClerkMembership() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: AYNA_CLERK_ORG_ID,
    userId: [userId],
    limit: 1,
  });

  const membership = memberships.data[0];
  if (!membership) redirect("/not-authorized");

  return { userId, membership };
}

/**
 * Resolves the signed-in Clerk user to the internal Ayna users row.
 * Organization membership is checked every time this helper is used, so an
 * outsider who creates/signs into a Clerk account still cannot read tracker
 * data. Removing someone from the Clerk org immediately removes tracker
 * access on their next request.
 */
export async function getOrCreateCurrentUser() {
  const { userId: authProviderId, membership } = await getAynaClerkMembership();

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser?.emailAddresses[0]?.emailAddress
    ?? "";
  const name = clerkUser
    ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email
    : email;

  const existingByProvider = await db.query.users.findFirst({
    where: eq(users.authProviderId, authProviderId),
  });

  if (existingByProvider) {
    // Internal deactivation is an additional lock. Do not silently reactivate
    // someone merely because their Clerk session is still valid.
    if (!existingByProvider.active) redirect("/not-authorized");

    const role = membership.role === "org:admin" && existingByProvider.role !== "viewer"
      ? "admin" as const
      : existingByProvider.role;

    await db.update(users).set({
      email: email || existingByProvider.email,
      name: name || existingByProvider.name,
      image: clerkUser?.imageUrl ?? existingByProvider.image,
      role,
      updatedAt: new Date(),
    }).where(eq(users.id, existingByProvider.id));

    return db.query.users.findFirst({ where: eq(users.id, existingByProvider.id) });
  }

  // Invited/pre-created teammates can claim their existing row on first
  // Clerk sign-in instead of creating a duplicate user by email.
  if (email) {
    const existingByEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingByEmail) {
      if (!existingByEmail.active) redirect("/not-authorized");

      const role = membership.role === "org:admin" && existingByEmail.role !== "viewer"
        ? "admin" as const
        : existingByEmail.role;
      await db.update(users).set({
        authProviderId,
        name: name || existingByEmail.name,
        image: clerkUser?.imageUrl ?? existingByEmail.image,
        role,
        updatedAt: new Date(),
      }).where(eq(users.id, existingByEmail.id));
      return db.query.users.findFirst({ where: eq(users.id, existingByEmail.id) });
    }
  }

  let workspace = (await db.query.workspaces.findMany({ limit: 1 }))[0];
  const isFirstUser = !workspace;
  if (!workspace) {
    const id = nanoid();
    await db.insert(workspaces).values({ id, name: "Ayna" });
    workspace = {
      id,
      name: "Ayna",
      timezone: "America/New_York",
      defaultDueTime: "17:00",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Reaching this point already proves Clerk membership in the Ayna org.
  const id = nanoid();
  await db.insert(users).values({
    id,
    workspaceId: workspace.id,
    authProviderId,
    email,
    name,
    image: clerkUser?.imageUrl,
    role: membership.role === "org:admin" || isFirstUser ? "admin" : "member",
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
