import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export const BEST_VERSION_PROJECT_ID = "s44jFHXzCxjRbF0E7vxbo";

let bootstrapPromise: Promise<void> | null = null;

export async function ensureBestVersionMasterList(projectId: string) {
  if (projectId !== BEST_VERSION_PROJECT_ID) return;

  if (!bootstrapPromise) {
    bootstrapPromise = runBestVersionBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}

async function runBestVersionBootstrap() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set; cannot bootstrap Best Version Updates.");
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const projectRows = await sql`
      SELECT id
      FROM projects
      WHERE id = ${BEST_VERSION_PROJECT_ID}
      LIMIT 1
    `;

    if (projectRows.length === 0) return;

    const taskRows = await sql`
      SELECT t.id, t.project_id, LOWER(u.email) AS owner_email
      FROM tasks t
      LEFT JOIN users u ON u.id = t.owner_id
      WHERE t.id IN ('bvu-beta-20260903-001', 'bvu-beta-20260903-123')
    `;

    const taskMap = new Map(
      taskRows.map((row) => [
        String(row.id),
        {
          projectId: row.project_id ? String(row.project_id) : null,
          ownerEmail: row.owner_email ? String(row.owner_email) : null,
        },
      ])
    );

    const oldRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM tasks
      WHERE id LIKE 'bvu-20260902-%'
    `;

    const exactListLoaded =
      taskMap.get('bvu-beta-20260903-001')?.projectId === BEST_VERSION_PROJECT_ID &&
      taskMap.get('bvu-beta-20260903-001')?.ownerEmail === 'ameera@aynahealth.co' &&
      taskMap.get('bvu-beta-20260903-123')?.projectId === BEST_VERSION_PROJECT_ID &&
      taskMap.get('bvu-beta-20260903-123')?.ownerEmail === 'ameera@aynahealth.co' &&
      Number(oldRows[0]?.count ?? 0) === 0;

    if (exactListLoaded) return;

    const replacementSql = await readFile(
      path.join(process.cwd(), "db", "bootstrap", "best_version_scope_cleanup.sql"),
      "utf8"
    );
    await sql.unsafe(replacementSql).simple();
  } finally {
    await sql.end({ timeout: 5 });
  }
}
