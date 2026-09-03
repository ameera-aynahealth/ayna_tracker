import "server-only";

import postgres from "postgres";

const SEP3_APP_TASK_IDS = [
  "meeting-20260903-consolidate-intake",
  "meeting-20260903-dev-access",
  "meeting-20260903-dark-mode",
  "meeting-20260903-comparison-tool",
  "meeting-20260903-ask-a",
  "meeting-20260903-profile-designs",
  "meeting-20260903-article-images",
  "meeting-20260903-apple-developer",
  "meeting-20260903-build-profile-page",
  "meeting-20260903-finish-app",
  "meeting-20260903-review-app",
] as const;

let repairPromise: Promise<void> | null = null;

export async function ensureSep3AppTaskProjectMapping() {
  if (!repairPromise) {
    repairPromise = runRepair().catch((error) => {
      repairPromise = null;
      throw error;
    });
  }
  await repairPromise;
}

async function runRepair() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const taskRows = await sql`
      SELECT workspace_id
      FROM tasks
      WHERE id = ANY(${sql.array([...SEP3_APP_TASK_IDS])})
      LIMIT 1
    `;
    const workspaceId = taskRows[0]?.workspace_id;
    if (!workspaceId) return;

    const projectRows = await sql`
      SELECT id
      FROM projects
      WHERE workspace_id = ${workspaceId}
        AND archived_at IS NULL
        AND status NOT IN ('completed'::project_status, 'cancelled'::project_status)
        AND LOWER(name) = 'app updates'
      LIMIT 1
    `;
    const appProject = projectRows[0];
    if (!appProject) return;

    await sql`
      UPDATE tasks
      SET project_id = ${appProject.id}, updated_at = NOW()
      WHERE id = ANY(${sql.array([...SEP3_APP_TASK_IDS])})
        AND workspace_id = ${workspaceId}
        AND project_id IS DISTINCT FROM ${appProject.id}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
