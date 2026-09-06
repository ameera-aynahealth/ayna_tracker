import "server-only";

import postgres from "postgres";

type ProjectBucket = "product" | "events" | "partnerships" | "fundraising" | "hiring" | "general";

type MeetingTask = {
  id: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  taskType: "task" | "meeting_action_item" | "approval" | "deliverable" | "content" | "partnership" | "administrative" | "research";
  dueAt: string | null;
  primary: string;
  collaborators: string[];
  bucket: ProjectBucket;
};

const SEP3_TASKS: MeetingTask[] = [
  {
    id: "meeting-20260903-review-contracts",
    title: "Review adviser and partnership contracts",
    description: "Review the adviser and partnership contracts drafted by Puloma before they are sent. Leave comments, flag anything unclear, and confirm when both are ready to finalize.",
    priority: "high",
    taskType: "approval",
    dueAt: "2026-09-05 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
    bucket: "partnerships",
  },
  {
    id: "meeting-20260903-consolidate-intake",
    title: "Consolidate and streamline health intake questions",
    description: "Remove repeated health intake questions and finalize the streamlined structure discussed in the Sep 3 meeting, including life stage wording, consolidated health goals, searchable symptoms, and medication/product-history inputs.",
    priority: "urgent",
    taskType: "deliverable",
    dueAt: "2026-09-04 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: ["ameera@aynahealth.co"],
    bucket: "product",
  },
  {
    id: "meeting-20260903-dev-access",
    title: "Set up Eliz's required Vercel and API access",
    description: "Give Eliz the access needed for development through the appropriate project/team permissions and environment-variable workflow. Do not share personal account passwords or personal login credentials.",
    priority: "high",
    taskType: "administrative",
    dueAt: "2026-09-04 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["puloma@aynahealth.co"],
    bucket: "product",
  },
  {
    id: "meeting-20260903-dark-mode",
    title: "Implement dark mode across the app",
    description: "Finish dark mode across app pages and product cards while keeping light mode as the default and ensuring visual consistency in both themes.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-comparison-tool",
    title: "Build product comparison tool",
    description: "Add a product comparison feature to the app/website so users can compare relevant products before the official release.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-08 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: ["puloma@aynahealth.co"],
    bucket: "product",
  },
  {
    id: "meeting-20260903-ask-a",
    title: "Add Ask A side tab",
    description: "Implement the Ask A side-tab interface in the application and make sure it works cleanly within the current navigation.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-profile-designs",
    title: "Design shopper profile page iterations",
    description: "Create several shopper-profile classification page directions inspired by personality-style quizzes so the team can choose a final direction.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-07 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-article-images",
    title: "Create article library images",
    description: "Download or design animated/graphic-style images for the vetted article library so the content has a consistent visual system.",
    priority: "medium",
    taskType: "content",
    dueAt: "2026-09-10 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-apple-developer",
    title: "Set up Apple Developer account for app testing",
    description: "Handle Apple Developer enrollment/setup needed for iPhone testing and distribution for the team, and document the account/distribution path the team will use.",
    priority: "medium",
    taskType: "administrative",
    dueAt: "2026-09-10 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-raffle-basket",
    title: "Get raffle basket for women's health products",
    description: "Find and obtain a basket for the $3-ticket women's health product raffle planned for upcoming events.",
    priority: "high",
    taskType: "meeting_action_item",
    dueAt: "2026-09-09 17:00:00-04",
    primary: "puloma@aynahealth.co",
    collaborators: [],
    bucket: "events",
  },
  {
    id: "meeting-20260903-inventory-event-items",
    title: "Inventory available event supplies and equipment",
    description: "Confirm what is already available for the conference/event setup, including tablecloths, extension cords, display items, women's health products, and any remaining gaps.",
    priority: "high",
    taskType: "meeting_action_item",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "events",
  },
  {
    id: "meeting-20260903-contact-ro",
    title: "Contact Ro about splitting the event drink tab",
    description: "Reach out to the Ro representative about co-hosting/supporting the event and ask whether they are willing to split the drink-tab cost.",
    priority: "high",
    taskType: "partnership",
    dueAt: "2026-09-05 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "events",
  },
  {
    id: "meeting-20260903-build-profile-page",
    title: "Build shopper profile classification page",
    description: "Build the technical components for the shopper-profile classification experience once the page direction is defined.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-09 17:00:00-04",
    primary: "puloma@aynahealth.co",
    collaborators: ["ameera@aynahealth.co"],
    bucket: "product",
  },
  {
    id: "meeting-20260903-contact-mercury",
    title: "Contact Mercury about a co-hosted event",
    description: "Follow up with Mercury/Ashley Brooke about interest in co-hosting, sponsoring, or splitting costs for an upcoming ayna event.",
    priority: "high",
    taskType: "partnership",
    dueAt: "2026-09-05 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "events",
  },
  {
    id: "meeting-20260903-stickers",
    title: "Finalize and order event stickers",
    description: "Finish the ayna sticker/marketplace-label design, share it in the group chat for approval, then place the order. This combines the duplicate sticker action items from the meeting notes.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "events",
  },
  {
    id: "meeting-20260903-tiktok-metrics",
    title: "Compile TikTok metrics for investor materials",
    description: "Calculate and organize the current TikTok/social performance metrics needed for investor materials ahead of the Sep 14 investor meeting.",
    priority: "high",
    taskType: "deliverable",
    dueAt: "2026-09-11 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: [],
    bucket: "fundraising",
  },
  {
    id: "meeting-20260903-finish-app",
    title: "Finish current app development pass",
    description: "Complete the current application-development pass by Sunday, resolve the known missing-image/UI issues, and get the build ready for Ameera's review.",
    priority: "urgent",
    taskType: "deliverable",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-review-app",
    title: "Review the app and provide final feedback",
    description: "Inspect the current app for functionality, quality, missing content/images, and UX issues, then send Eliz a prioritized feedback list before the release pass is finalized.",
    priority: "high",
    taskType: "approval",
    dueAt: "2026-09-06 20:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: [],
    bucket: "product",
  },
  {
    id: "meeting-20260903-review-anaka",
    title: "Review Anaka's resume",
    description: "Re-evaluate Anaka's resume for fit with the team and note strengths, concerns, and recommended next step.",
    priority: "medium",
    taskType: "meeting_action_item",
    dueAt: "2026-09-07 17:00:00-04",
    primary: "puloma@aynahealth.co",
    collaborators: [],
    bucket: "hiring",
  },
  {
    id: "meeting-20260903-review-applicant-email",
    title: "Review applicant email, resume, and writing fit",
    description: "Find the forwarded applicant email/resume and evaluate the candidate's marketing/content background, especially writing and journalism experience, for possible team roles.",
    priority: "medium",
    taskType: "meeting_action_item",
    dueAt: "2026-09-07 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
    bucket: "hiring",
  },
  {
    id: "meeting-20260903-potential-writers",
    title: "Contact potential medical article writers/reviewers",
    description: "Ask your sister whether she or people she knows would be interested in drafting or reviewing medical articles for ayna and follow up on the specific mutual connection discussed in the meeting.",
    priority: "medium",
    taskType: "content",
    dueAt: "2026-09-08 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: [],
    bucket: "hiring",
  },
  {
    id: "meeting-20260903-followup-alubri",
    title: "Follow up with Alubri",
    description: "Send a follow-up to Alubri regarding the outstanding response and record the outcome in the partnership tracker.",
    priority: "medium",
    taskType: "partnership",
    dueAt: "2026-09-05 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
    bucket: "partnerships",
  },
  {
    id: "meeting-20260903-business-cards",
    title: "Finalize and order 500 general ayna business cards",
    description: "Use the $12 front-only 500-card option, general ayna contact information, Puloma's selected contact details, and a Linktree QR code. Finalize the design/vendor and place the order.",
    priority: "high",
    taskType: "administrative",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["puloma@aynahealth.co"],
    bucket: "general",
  },
];

let bootstrapPromise: Promise<void> | null = null;

function pickProject(projects: Array<{ id: string; name: string }>, bucket: ProjectBucket) {
  const patterns: Record<ProjectBucket, RegExp[]> = {
    product: [/best version/i, /product/i, /app/i],
    events: [/event/i],
    partnerships: [/partnership/i, /brand/i],
    fundraising: [/fundrais/i, /invest/i],
    hiring: [/hiring/i, /team/i, /recruit/i],
    general: [/operations/i, /admin/i],
  };

  for (const pattern of patterns[bucket]) {
    const match = projects.find((project) => pattern.test(project.name));
    if (match) return match.id;
  }

  return null;
}

export async function ensureSep3MeetingTasks() {
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
    const workspaceId = members.find((row) => String(row.email) === "ameera@aynahealth.co")?.workspace_id;
    if (!ameeraId || !workspaceId) return;

    const projectRows = await sql`
      SELECT id, name
      FROM projects
      WHERE workspace_id = ${workspaceId}
        AND archived_at IS NULL
        AND status NOT IN ('completed'::project_status, 'cancelled'::project_status)
    `;
    const projects = projectRows.map((row) => ({ id: String(row.id), name: String(row.name) }));

    for (const task of SEP3_TASKS) {
      const primaryId = memberMap.get(task.primary) ?? ameeraId;
      const projectId = pickProject(projects, task.bucket);

      await sql`
        INSERT INTO tasks (
          id, workspace_id, project_id, title, description, status, priority, task_type,
          owner_id, created_by_id, due_at, original_due_at, due_timezone,
          last_activity_at, created_at, updated_at
        )
        VALUES (
          ${task.id}, ${workspaceId}, ${projectId}, ${task.title}, ${task.description},
          'not_started'::task_status, ${task.priority}::task_priority, ${task.taskType}::task_type,
          ${primaryId}, ${ameeraId}, ${task.dueAt}::timestamptz, ${task.dueAt}::timestamptz,
          'America/New_York', NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;

      for (const email of task.collaborators) {
        const collaboratorId = memberMap.get(email);
        if (!collaboratorId || collaboratorId === primaryId) continue;
        await sql`
          INSERT INTO task_collaborators (task_id, user_id)
          VALUES (${task.id}, ${collaboratorId})
          ON CONFLICT DO NOTHING
        `;
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
