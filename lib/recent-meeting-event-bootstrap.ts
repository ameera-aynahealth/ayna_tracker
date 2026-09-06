import "server-only";

import postgres from "postgres";

const EVENT_TASKS = [
  {
    id: "event-20260903-ritual",
    title: "Follow up with Ritual Fitness on the event partnership",
    description: "Follow up specifically on the event collaboration with Ritual Fitness / House Ritual. Confirm what activation, sponsorship, class, ticketed event, or other event format they want to pursue and turn it into a concrete next step.",
    priority: "urgent",
    dueAt: "2026-09-04 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-corgi",
    title: "Finalize Corgi Cafe event logistics and format",
    description: "Finalize the Corgi Cafe networking event plan: date/time, capacity, lighting/space constraints, venue requirements, attendee-pays-own-drinks format, setup, and final run-of-show. Do not create a duplicate email-follow-up task.",
    priority: "high",
    dueAt: "2026-09-07 17:00:00-04",
    primary: "eliz@aynahealth.co",
    collaborators: [],
  },
  {
    id: "event-20260903-rooftop",
    title: "Confirm Cubico Soho rooftop and rooftop-event logistics",
    description: "Confirm rooftop availability and lock the professional co-working/networking event plan, including capacity, access, setup, timing, attendee flow, and a weather backup.",
    priority: "high",
    dueAt: "2026-09-05 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-paint-sip",
    title: "Finalize Paint & Sip event plan and supplies",
    description: "Finalize format, capacity, setup, supplies, beverage plan, and attendee experience for the Paint & Sip. Account for the acrylic paint and canvases already available.",
    priority: "high",
    dueAt: "2026-09-07 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-rsvp",
    title: "Finalize audience, RSVP, and ticketing strategy for NYC events",
    description: "Define the target audience and registration strategy for the NYC events, prioritizing useful networking with women and female founders. Decide where RSVP, tickets, contracts, or attendee caps are needed so attendance is intentional rather than purely casual.",
    priority: "high",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-ai-powered-women",
    title: "Prepare the AI-Powered Women Conference booth and product display",
    description: "Prepare ayna's Sep 12-13 conference presence: booth/display layout, products on hand, signage, QR codes, partner labels, transport, setup, and a simple attendee flow. Brand outreach emails are already handled, so this task is execution only.",
    priority: "urgent",
    dueAt: "2026-09-09 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-level-up",
    title: "Finalize Level Up conference networking plan",
    description: "Plan ayna's Sep 15 Level Up attendance and the networking session planned around the conference. Define the people to meet, goals, location/format for the follow-on networking session, and a simple run-of-show.",
    priority: "high",
    dueAt: "2026-09-10 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-marketing",
    title: "Create the event promotion and posting calendar",
    description: "Own the marketing for the upcoming events: RSVP launch posts, TikTok/Instagram/LinkedIn promotion where relevant, reminder posts, day-of content, and post-event recap content. Keep execution dates aligned with each event.",
    priority: "high",
    dueAt: "2026-09-06 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: [],
  },
  {
    id: "event-20260903-nyc-runbook",
    title: "Build the NYC event weekend run-of-show and logistics checklist",
    description: "Create one shared checklist covering the planned Corgi Cafe Friday event, Saturday Paint & Sip, and Sunday rooftop event: supplies, transport, setup/cleanup, venue contacts, attendee flow, responsibilities, and contingencies.",
    priority: "high",
    dueAt: "2026-09-14 17:00:00-04",
    primary: "ameera@aynahealth.co",
    collaborators: ["eliz@aynahealth.co"],
  },
  {
    id: "event-20260903-boston-ai",
    title: "Plan ayna's Boston AI conference strategy",
    description: "Confirm the Boston AI conference details and decide ayna's goals for attending: investor/founder networking, partnerships, press, customer discovery, and whether a booth, panel, meeting schedule, or other activation is worth pursuing. Then lock travel and a target-meeting list.",
    priority: "high",
    dueAt: "2026-09-12 17:00:00-04",
    primary: "puloma@aynahealth.co",
    collaborators: ["ameera@aynahealth.co", "eliz@aynahealth.co"],
  },
] as const;

export async function ensureRecentMeetingEventTasks(projectId: string) {
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
      SELECT id, workspace_id, name
      FROM projects
      WHERE id = ${projectId}
        AND archived_at IS NULL
      LIMIT 1
    `;
    const project = projectRows[0];
    if (!project || !String(project.name).toLowerCase().includes("event")) return;

    const memberRows = await sql`
      SELECT id, LOWER(email) AS email
      FROM users
      WHERE workspace_id = ${project.workspace_id}
        AND active = TRUE
        AND LOWER(email) IN ('ameera@aynahealth.co', 'eliz@aynahealth.co', 'puloma@aynahealth.co')
    `;
    const members = new Map(memberRows.map((row) => [String(row.email), String(row.id)]));
    const ameeraId = members.get("ameera@aynahealth.co");
    if (!ameeraId) return;

    for (const task of EVENT_TASKS) {
      const primaryOwnerId = members.get(task.primary) ?? ameeraId;
      await sql`
        INSERT INTO tasks (
          id, workspace_id, project_id, title, description, status, priority, task_type,
          owner_id, created_by_id, due_at, original_due_at, due_timezone,
          last_activity_at, created_at, updated_at
        )
        VALUES (
          ${task.id}, ${project.workspace_id}, ${projectId}, ${task.title}, ${task.description},
          'not_started'::task_status, ${task.priority}::task_priority, 'task'::task_type,
          ${primaryOwnerId}, ${ameeraId}, ${task.dueAt}::timestamptz, ${task.dueAt}::timestamptz,
          'America/New_York', NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;

      for (const email of task.collaborators) {
        const collaboratorId = members.get(email);
        if (!collaboratorId || collaboratorId === primaryOwnerId) continue;
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
