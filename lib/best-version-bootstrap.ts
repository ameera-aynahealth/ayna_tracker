import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export const BEST_VERSION_PROJECT_ID = "s44jFHXzCxjRbF0E7vxbo";

let bootstrapPromise: Promise<void> | null = null;

/**
 * Ensures the existing Best Version Updates project has its beta-fix master
 * list and milestones. This intentionally does not re-enable migrations in
 * Vercel builds: the import is scoped to this project and runs only after an
 * authenticated user opens the project page.
 */
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
      SELECT id, title
      FROM tasks
      WHERE id IN ('bvu-20260902-002', 'bvu-20260902-021', 'bvu-20260902-101')
    `;
    const milestoneRows = await sql`
      SELECT id, title
      FROM milestones
      WHERE id IN ('bvu-ms-20260910', 'bvu-ms-20260930')
    `;

    const taskMap = new Map(taskRows.map((row) => [String(row.id), String(row.title)]));
    const milestoneMap = new Map(milestoneRows.map((row) => [String(row.id), String(row.title)]));

    const fullyLoaded =
      taskMap.get('bvu-20260902-002') === 'Import the full Best Version Updates beta master list into the tracker' &&
      taskMap.get('bvu-20260902-021') === 'Run full no-console-error beta smoke test' &&
      taskMap.has('bvu-20260902-101') &&
      milestoneMap.get('bvu-ms-20260910') === 'Beta feedback fixes ready for re-test' &&
      milestoneMap.has('bvu-ms-20260930');

    if (fullyLoaded) return;

    const migrationDirectory = path.join(process.cwd(), "db", "migrations");
    const masterListSql = await readFile(
      path.join(migrationDirectory, "0001_best_version_master_list.sql"),
      "utf8"
    );
    const betaLabelsSql = await readFile(
      path.join(migrationDirectory, "0002_beta_phase_labels.sql"),
      "utf8"
    );

    // No parameters are interpolated into these checked-in SQL files. Simple
    // query mode intentionally supports the multiple statements in each file.
    await sql.unsafe(masterListSql).simple();
    await sql.unsafe(betaLabelsSql).simple();
  } finally {
    await sql.end({ timeout: 5 });
  }
}
