import "server-only";

import postgres from "postgres";

let ensurePromise: Promise<void> | null = null;

export function ensureAttachmentFileSchema() {
  if (ensurePromise) return ensurePromise;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Promise.resolve();

  ensurePromise = (async () => {
    const sql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 5,
    });

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS attachment_files (
          attachment_id TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
          mime_type TEXT NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    } finally {
      await sql.end({ timeout: 5 });
    }
  })().catch((error) => {
    ensurePromise = null;
    throw error;
  });

  return ensurePromise;
}
