import "server-only";

import postgres from "postgres";

type GrantTask = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  startAt?: string | null;
  priority: "urgent" | "high" | "medium" | "low";
  url: string;
};

const GRANT_TASKS: GrantTask[] = [
  {
    id: "grant-2026-nih-sbir-sttr",
    title: "Apply to NIH SBIR/STTR",
    description: "Prepare and submit the NIH SBIR/STTR application. Position ayna around its personalized, evidence-based women's health recommendation technology and non-dilutive health R&D opportunity.",
    dueAt: "2026-09-08 17:00:00-04",
    priority: "urgent",
    url: "https://seed.nih.gov/small-business-funding/find-funding/sbir-sttr-funding-opportunities",
  },
  {
    id: "grant-2026-nsf-seed-fund",
    title: "Submit NSF America's Seed Fund Project Pitch",
    description: "Submit the initial NSF America's Seed Fund SBIR/STTR Project Pitch for ayna's personalized health discovery technology. This opportunity is rolling, so no fixed due date is set in the tracker.",
    dueAt: null,
    priority: "medium",
    url: "https://seedfund.nsf.gov/",
  },
  {
    id: "grant-2026-samsung-leaps",
    title: "Apply to Samsung LEAP-S Women's Health & FemTech",
    description: "Submit ayna for Samsung LEAP-S consideration. Women's Health & FemTech is a direct fit, including AI insights, specialized datasets, and longitudinal health. No published deadline is listed, so no fixed due date is set in the tracker.",
    dueAt: null,
    priority: "high",
    url: "https://sra.samsung.com/collaboration/leaps/leaps-apply/",
  },
  {
    id: "grant-2026-main-street-rising-nyc",
    title: "Apply to Hello Alice + Google Main Street Rising NYC Pitch",
    description: "Submit ayna for the free NYC pitch opportunity and cash prize, emphasizing the AI + women's health startup story.",
    dueAt: "2026-09-23 17:00:00-04",
    priority: "urgent",
    url: "https://mainstreet.helloalice.com/",
  },
  {
    id: "grant-2026-ifundwomen-universal",
    title: "Submit IFW Universal Funding & Grant Application",
    description: "Complete the IFW Universal Funding & Grant Application so ayna can be matched with future corporate grants. This application is rolling, so no fixed due date is set in the tracker.",
    dueAt: null,
    priority: "medium",
    url: "https://www.ifundwomen.com/grants/universal-funding-grant-application/welcome",
  },
  {
    id: "grant-2027-cornell-student-business-year",
    title: "Apply to Cornell Student Business of the Year",
    description: "Apply for Cornell Student Business of the Year and confirm ayna meets the student-team eligibility requirements. The application opens Dec. 1, 2026 and the award includes a $5,000 cash prize.",
    startAt: "2026-12-01 09:00:00-05",
    dueAt: "2027-03-16 17:00:00-04",
    priority: "low",
    url: "https://eship.cornell.edu/item/student-business-of-the-year/",
  },
  {
    id: "grant-2026-verizon-digital-ready",
    title: "Apply to Verizon Small Business Digital Ready $10K Grant",
    description: "Complete the qualifying Verizon Small Business Digital Ready requirements and apply for the $10,000 grant. Complete two qualifying courses/events by Dec. 7, 2026.",
    dueAt: "2026-12-07 17:00:00-05",
    priority: "high",
    url: "https://digitalready.verizonwireless.com/funding/details",
  },
  {
    id: "grant-2026-skip-fall-10k",
    title: "Apply to Skip $10,000 Fall Grant",
    description: "Submit ayna for the current Skip $10,000 Fall Grant. Broad startup eligibility makes this a low-friction application worth completing.",
    dueAt: "2026-09-18 23:59:00-04",
    priority: "urgent",
    url: "https://helloskip.com/dashboard/opportunity/10k-fall-grants",
  },
];

let bootstrapPromise: Promise<void> | null = null;

export async function ensureGrantApplicationTasks() {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}

async function runBootstrap() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const members = await sql`
      SELECT id, workspace_id, LOWER(email) AS email
      FROM users
      WHERE active = TRUE
        AND LOWER(email) IN ('ameera@aynahealth.co', 'eliz@aynahealth.co', 'puloma@aynahealth.co')
    `;

    const memberMap = new Map(members.map((row) => [String(row.email), String(row.id)]));
    const ameeraId = memberMap.get("ameera@aynahealth.co");
    const elizId = memberMap.get("eliz@aynahealth.co");
    const pulomaId = memberMap.get("puloma@aynahealth.co");
    const workspaceId = members.find((row) => String(row.email) === "ameera@aynahealth.co")?.workspace_id;
    if (!ameeraId || !elizId || !pulomaId || !workspaceId) return;

    const projectRows = await sql`
      SELECT id
      FROM projects
      WHERE workspace_id = ${workspaceId}
        AND archived_at IS NULL
        AND LOWER(TRIM(name)) = 'grant applications'
      LIMIT 1
    `;
    const projectId = projectRows[0]?.id ? String(projectRows[0].id) : null;
    if (!projectId) return;

    for (const task of GRANT_TASKS) {
      await sql`
        INSERT INTO tasks (
          id, workspace_id, project_id, title, description, status, priority, task_type,
          owner_id, created_by_id, start_at, due_at, original_due_at, due_timezone,
          last_activity_at, created_at, updated_at
        )
        VALUES (
          ${task.id}, ${workspaceId}, ${projectId}, ${task.title}, ${task.description},
          'not_started'::task_status, ${task.priority}::task_priority, 'deliverable'::task_type,
          ${elizId}, ${ameeraId}, ${task.startAt ?? null}::timestamptz, ${task.dueAt}::timestamptz,
          ${task.dueAt}::timestamptz, 'America/New_York', NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;

      await sql`
        INSERT INTO task_collaborators (task_id, user_id)
        VALUES (${task.id}, ${pulomaId})
        ON CONFLICT DO NOTHING
      `;

      await sql`
        INSERT INTO attachments (id, task_id, uploaded_by_id, kind, name, url, created_at)
        VALUES (${`${task.id}-application-link`}, ${task.id}, ${ameeraId}, 'link', 'Application link', ${task.url}, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
