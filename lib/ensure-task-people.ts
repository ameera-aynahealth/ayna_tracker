import "server-only";

import { db } from "@/db";
import { sql } from "drizzle-orm";

let ensurePromise: Promise<void> | null = null;

/**
 * The tracker intentionally does not run database migrations during Vercel
 * builds. Create the small join table needed for multi-reviewer tasks at
 * runtime before any query or action uses it. The statement is idempotent and
 * preserves the existing single-reviewer column for backwards compatibility.
 */
export async function ensureTaskPeopleSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS task_reviewers (
          task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (task_id, user_id)
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS task_reviewers_user_idx
        ON task_reviewers(user_id)
      `);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}
