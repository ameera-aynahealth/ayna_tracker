import dotenv from "dotenv";
import postgres from "postgres";
import { nanoid } from "nanoid";

dotenv.config({ path: ".env.local" });
dotenv.config();

const partnershipStages = JSON.stringify([
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "meeting", label: "Meeting" },
  { key: "negotiating", label: "Negotiating" },
  { key: "contract", label: "Contract" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
]);

const influencerStages = JSON.stringify([
  { key: "prospect", label: "Prospect" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "negotiating", label: "Negotiating" },
  { key: "confirmed", label: "Confirmed" },
  { key: "posted", label: "Posted" },
  { key: "complete", label: "Complete" },
]);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  console.log("Setting up tracker tables...");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "trackers" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id"),
      "name" text NOT NULL,
      "description" text,
      "item_label" text NOT NULL DEFAULT 'Item',
      "stages" text NOT NULL,
      "archived_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "tracker_items" (
      "id" text PRIMARY KEY NOT NULL,
      "tracker_id" text NOT NULL REFERENCES "trackers"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "stage" text NOT NULL,
      "action_state" text NOT NULL DEFAULT 'none',
      "owner_id" text REFERENCES "users"("id"),
      "contact_name" text,
      "contact_email" text,
      "last_contact_at" timestamptz,
      "next_action" text,
      "followup_at" timestamptz,
      "notes" text,
      "archived_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );
  `);

  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "trackers_workspace_idx" ON "trackers" ("workspace_id");`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_tracker_idx" ON "tracker_items" ("tracker_id");`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_owner_idx" ON "tracker_items" ("owner_id");`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_followup_idx" ON "tracker_items" ("followup_at");`);

  const workspaceRows = await sql`SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1`;
  const workspaceId = workspaceRows[0]?.id as string | undefined;
  if (workspaceId) {
    const starterTrackers = [
      {
        name: "Partnerships",
        itemLabel: "Brand",
        description: "Brand outreach, meetings, negotiation, contracts, and active partnerships.",
        stages: partnershipStages,
      },
      {
        name: "Influencers",
        itemLabel: "Influencer",
        description: "Creator outreach, negotiations, confirmed content, and completed collaborations.",
        stages: influencerStages,
      },
    ];

    for (const tracker of starterTrackers) {
      const existing = await sql`SELECT id FROM trackers WHERE workspace_id = ${workspaceId} AND lower(name) = lower(${tracker.name}) LIMIT 1`;
      if (!existing.length) {
        await sql`
          INSERT INTO trackers (id, workspace_id, name, description, item_label, stages)
          VALUES (${nanoid()}, ${workspaceId}, ${tracker.name}, ${tracker.description}, ${tracker.itemLabel}, ${tracker.stages})
        `;
        console.log(`Created starter tracker: ${tracker.name}`);
      }
    }
  }

  console.log("Tracker tables are ready.");
  await sql.end();
}

main().catch((error) => {
  console.error("Tracker setup failed:", error);
  process.exit(1);
});
