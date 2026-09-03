import "server-only";

import postgres from "postgres";

const APP_UPDATE_TASK_IDS = [
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

export async function repairSep3TasksIntoAppUpdates() {
  if (!repairPromise) {
    repairPromise = runRepair().catch((error) => {
      console.error("App Updates task repair failed:", error);
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
    const projectRows = await sql`
      SELECT id, workspace_id
      FROM projects
      WHERE archived_at IS NULL
        AND LOWER(TRIM(name)) = 'app updates'
      LIMIT 1
    `;

    const appProject = projectRows[0];
    if (!appProject) return;

    for (const taskId of APP_UPDATE_TASK_IDS) {
      await sql`
        UPDATE tasks
        SET project_id = ${appProject.id}, updated_at = NOW()
        WHERE id = ${taskId}
          AND workspace_id = ${appProject.workspace_id}
          AND project_id IS DISTINCT FROM ${appProject.id}
      `;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
