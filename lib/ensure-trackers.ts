import "server-only";
import postgres from "postgres";
import { nanoid } from "nanoid";

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

type TrackerSetupGlobals = {
  trackerSetupPromise?: Promise<void>;
};

const globalForTrackers = globalThis as unknown as TrackerSetupGlobals;

async function setupTrackerSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
    throw new Error("DATABASE_URL is unavailable in this environment. Tracker setup must run in a Vercel runtime with the production database secret available.");
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      // Serializes bootstrap work across concurrent cold starts so starter
      // trackers cannot be duplicated by two requests racing each other.
      await tx`SELECT pg_advisory_xact_lock(hashtext('ayna_tracker_schema_v1'))`;

      await tx.unsafe(`
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

      await tx.unsafe(`
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

      await tx.unsafe(`CREATE INDEX IF NOT EXISTS "trackers_workspace_idx" ON "trackers" ("workspace_id");`);
      await tx.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_tracker_idx" ON "tracker_items" ("tracker_id");`);
      await tx.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_owner_idx" ON "tracker_items" ("owner_id");`);
      await tx.unsafe(`CREATE INDEX IF NOT EXISTS "tracker_items_followup_idx" ON "tracker_items" ("followup_at");`);

      const workspaceRows = await tx`SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1`;
      const workspaceId = workspaceRows[0]?.id as string | undefined;
      if (!workspaceId) return;

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
        const existing = await tx`
          SELECT id FROM trackers
          WHERE workspace_id = ${workspaceId} AND lower(name) = lower(${tracker.name})
          LIMIT 1
        `;
        if (!existing.length) {
          await tx`
            INSERT INTO trackers (id, workspace_id, name, description, item_label, stages)
            VALUES (${nanoid()}, ${workspaceId}, ${tracker.name}, ${tracker.description}, ${tracker.itemLabel}, ${tracker.stages})
          `;
        }
      }
    });
  } finally {
    await sql.end();
  }
}

export async function ensureTrackerSchema() {
  if (!globalForTrackers.trackerSetupPromise) {
    globalForTrackers.trackerSetupPromise = setupTrackerSchema().catch((error) => {
      globalForTrackers.trackerSetupPromise = undefined;
      throw error;
    });
  }
  return globalForTrackers.trackerSetupPromise;
}
