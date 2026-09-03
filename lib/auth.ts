import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

/**
 * Ayna Tracker is private to the Ayna team.
 * Access is granted only when the signed-in Clerk account currently contains
 * an @aynahealth.co email address. No Clerk organization membership or
 * invitation is required.
 */
export const AYNA_EMAIL_DOMAIN = "@aynahealth.co";

// Core teammate emergency access. These exact identities can never be blocked
// by the tracker's internal active/inactive flag. The Clerk user ID is included
// as a second safety net so a stale/mislinked internal email cannot lock Puloma
// out after Clerk has already authenticated her account.
const ALWAYS_ACTIVE_AYNA_EMAILS = new Set(["puloma@aynahealth.co"]);
const ALWAYS_ACTIVE_CLERK_USER_IDS = new Set(["user_3ITAbnr6N1meBHq4v3IMp2ym2Xo"]);

export function isAynaEmail(email: string) {
  return email.trim().toLowerCase().endsWith(AYNA_EMAIL_DOMAIN);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAlwaysActiveIdentity(authProviderId: string, email: string) {
  return ALWAYS_ACTIVE_CLERK_USER_IDS.has(authProviderId)
    || ALWAYS_ACTIVE_AYNA_EMAILS.has(normalizeEmail(email));
}

export async function getAynaClerkUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();

  // Do not rely on Clerk's primary email alone. A teammate can sign in with
  // Google Workspace while Clerk still keeps a personal address as primary.
  // Accept the account when ANY currently attached Clerk/Google email is Ayna.
  const directAynaEmail = clerkUser?.emailAddresses.find((entry) => isAynaEmail(entry.emailAddress))?.emailAddress;
  const externalAynaEmail = clerkUser?.externalAccounts.find((account) => isAynaEmail(account.emailAddress ?? ""))?.emailAddress;
  const email = normalizeEmail(directAynaEmail ?? externalAynaEmail ?? "");

  // Puloma's exact Clerk identity is an emergency-safe identity. It may pass
  // even if Clerk temporarily fails to expose the linked email in currentUser;
  // we still canonicalize her internal email to the Ayna address below.
  if (!isAynaEmail(email) && !ALWAYS_ACTIVE_CLERK_USER_IDS.has(userId)) {
    redirect("/not-authorized?reason=email");
  }

  return {
    userId,
    clerkUser,
    email: ALWAYS_ACTIVE_CLERK_USER_IDS.has(userId) ? "puloma@aynahealth.co" : email,
  };
}

/**
 * Resolves the signed-in account to the internal Ayna users row.
 * The @aynahealth.co domain check runs every time this helper is used.
 * Internal deactivation remains an additional lock for normal teammates.
 *
 * Puloma's exact Ayna email + Clerk user ID are protected from accidental
 * internal lockout: once Clerk authenticates that identity, the tracker
 * automatically reactivates the canonical internal profile.
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

  const alwaysActive = isAlwaysActiveIdentity(authProviderId, email);
  const name = clerkUser
    ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email
    : email;

  // Read both identities up front. This also lets a protected teammate get in
  // even if an old/stale internal row exists from a previous auth setup.
  const [existingByProvider, existingByEmail] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.authProviderId, authProviderId) }),
    db.query.users.findFirst({ where: eq(users.email, email) }),
  ]);

  if (existingByProvider) {
    if (!existingByProvider.active && !alwaysActive) redirect("/not-authorized?reason=inactive");

    // If a stale second row already owns the exact email, do not trigger the
    // unique email constraint. The authenticated provider row is still safe to
    // use, and protected accounts are reactivated automatically.
    const emailOwnedByAnotherRow = existingByEmail && existingByEmail.id !== existingByProvider.id;
    await db.update(users).set({
      ...(emailOwnedByAnotherRow ? {} : { email }),
      name: name || existingByProvider.name,
      image: clerkUser?.imageUrl ?? existingByProvider.image,
      ...(alwaysActive ? { active: true } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, existingByProvider.id));

    return db.query.users.findFirst({ where: eq(users.id, existingByProvider.id) });
  }

  if (existingByEmail) {
    if (!existingByEmail.active && !alwaysActive) redirect("/not-authorized?reason=inactive");

    await db.update(users).set({
      authProviderId,
      name: name || existingByEmail.name,
      image: clerkUser?.imageUrl ?? existingByEmail.image,
      ...(alwaysActive ? { active: true } : {}),
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
    active: true,
  }).onConflictDoNothing();

  // Another request may have created this exact user between the checks above
  // and the insert. Always resolve the canonical row after the insert attempt.
  const resolvedByProvider = await db.query.users.findFirst({
    where: eq(users.authProviderId, authProviderId),
  });
  if (resolvedByProvider) {
    if (!resolvedByProvider.active && !alwaysActive) redirect("/not-authorized?reason=inactive");
    if (alwaysActive && !resolvedByProvider.active) {
      await db.update(users).set({ active: true, updatedAt: new Date() }).where(eq(users.id, resolvedByProvider.id));
      return db.query.users.findFirst({ where: eq(users.id, resolvedByProvider.id) });
    }
    return resolvedByProvider;
  }

  const resolvedByEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (resolvedByEmail) {
    if (!resolvedByEmail.active && !alwaysActive) redirect("/not-authorized?reason=inactive");

    // Covers a rare concurrent email-linking race without creating a duplicate.
    if (resolvedByEmail.authProviderId !== authProviderId || (alwaysActive && !resolvedByEmail.active)) {
      await db.update(users).set({
        authProviderId,
        name: name || resolvedByEmail.name,
        image: clerkUser?.imageUrl ?? resolvedByEmail.image,
        ...(alwaysActive ? { active: true } : {}),
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
