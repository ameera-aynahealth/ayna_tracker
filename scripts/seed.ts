import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { nanoid } from "nanoid";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production environment. Aborting.");
  process.exit(1);
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log("Seeding dev data...");

  const workspaceId = nanoid();
  await db.insert(schema.workspaces).values({ id: workspaceId, name: "Ayna" });

  const workstreamIds: Record<string, string> = {};
  for (const name of ["Launch", "Partnerships", "Social Media / Content", "Product / Engineering", "Events"]) {
    const id = nanoid();
    workstreamIds[name] = id;
    await db.insert(schema.workstreams).values({ id, workspaceId, name });
  }

  const people = [
    { name: "Ameera", email: "ameera@aynahealth.co", role: "admin" as const },
    { name: "Puloma", email: "puloma@aynahealth.co", role: "admin" as const },
    { name: "Eliz", email: "eliz@aynahealth.co", role: "member" as const },
  ];
  const userIds: Record<string, string> = {};
  for (const p of people) {
    const id = nanoid();
    userIds[p.name] = id;
    // authProviderId is a placeholder until each person signs in via Clerk;
    // getOrCreateCurrentUser links the real Clerk id on first sign-in for
    // whichever email matches, so re-seeding won't create duplicates as long
    // as you match emails to real Clerk accounts.
    await db.insert(schema.users).values({
      id, workspaceId, authProviderId: `seed_${id}`, email: p.email, name: p.name, role: p.role,
    });
  }

  const projectDefs = [
    { name: "NYC Launch Week", workstream: "Launch", ownerId: userIds["Ameera"], status: "active" as const, health: "needs_attention" as const, dueInDays: 10 },
    { name: "Brand & Press Outreach", workstream: "Partnerships", ownerId: userIds["Ameera"], status: "active" as const, health: "on_track" as const, dueInDays: 21 },
    { name: "Ayna x Neycher Partnership", workstream: "Partnerships", ownerId: userIds["Puloma"], status: "at_risk" as const, health: "at_risk" as const, dueInDays: 5 },
    { name: "TikTok Content & Growth", workstream: "Social Media / Content", ownerId: userIds["Ameera"], status: "active" as const, health: "on_track" as const, dueInDays: 30 },
  ];
  const projectIds: Record<string, string> = {};
  for (const p of projectDefs) {
    const id = nanoid();
    projectIds[p.name] = id;
    await db.insert(schema.projects).values({
      id, workspaceId, name: p.name, ownerId: p.ownerId,
      workstreamId: workstreamIds[p.workstream], status: p.status, health: p.health,
      dueDate: addDays(p.dueInDays),
    });
  }

  const taskDefs = [
    { title: "Re-sign Neycher partnership agreement", project: "Ayna x Neycher Partnership", owner: "Puloma", status: "waiting" as const, priority: "urgent" as const, dueInDays: -2, waitingOnName: "Veronica", waitingOnOrg: "Neycher" },
    { title: "Send Femtech Insider launch press kit", project: "Brand & Press Outreach", owner: "Ameera", status: "not_started" as const, priority: "high" as const, dueInDays: 0 },
    { title: "Fix Ayna TikTok Creator account suppression", project: "TikTok Content & Growth", owner: "Ameera", status: "in_progress" as const, priority: "urgent" as const, dueInDays: 0 },
    { title: "Confirm pop-up gifting suite vendor load-in", project: "NYC Launch Week", owner: "Eliz", status: "waiting" as const, priority: "high" as const, dueInDays: 1, waitingOnName: "Venue coordinator" },
    { title: "Draft waitlist email #2", project: "NYC Launch Week", owner: "Ameera", status: "not_started" as const, priority: "medium" as const, dueInDays: 2 },
    { title: "Follow up: 12 awaiting-reply outreach contacts", project: "Brand & Press Outreach", owner: "Ameera", status: "not_started" as const, priority: "medium" as const, dueInDays: 2 },
    { title: "Finalize NYC pop-up staffing schedule", project: "NYC Launch Week", owner: "Eliz", status: "not_started" as const, priority: "high" as const, dueInDays: 4 },
    { title: "Ship v1 of Ayna recommendation quiz", project: "TikTok Content & Growth", owner: "Puloma", status: "blocked" as const, priority: "high" as const, dueInDays: 6, blockedReason: "Waiting on design assets" },
    { title: "Investor deck refresh", project: "Brand & Press Outreach", owner: "Puloma", status: "not_started" as const, priority: "low" as const, dueInDays: 14 },
    { title: "Book venue walkthrough", project: "NYC Launch Week", owner: "Eliz", status: "completed" as const, priority: "medium" as const, dueInDays: -5 },
  ];

  for (const t of taskDefs) {
    const id = nanoid();
    const dueAt = addDays(t.dueInDays);
    await db.insert(schema.tasks).values({
      id, workspaceId,
      projectId: projectIds[t.project],
      title: t.title,
      ownerId: userIds[t.owner],
      createdById: userIds["Ameera"],
      status: t.status,
      priority: t.priority,
      dueAt,
      originalDueAt: dueAt,
      waitingOnName: t.waitingOnName,
      waitingOnOrg: t.waitingOnOrg,
      waitingSince: t.status === "waiting" ? new Date() : undefined,
      blockedReason: t.blockedReason,
      blockedSince: t.status === "blocked" ? new Date() : undefined,
      completedAt: t.status === "completed" ? new Date() : undefined,
      completedById: t.status === "completed" ? userIds[t.owner] : undefined,
    });
    await db.insert(schema.activityLogs).values({
      id: nanoid(), taskId: id, userId: userIds["Ameera"], action: "created", newValue: t.title,
    });
  }

  console.log("Seed complete.");
  await sql.end();
}

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d;
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
