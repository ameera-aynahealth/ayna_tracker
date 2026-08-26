"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

type OwnerKey = "ameera" | "puloma" | "eliz" | null;
type AreaKey = "product" | "partnerships" | "marketing" | "operations" | "fundraising" | "recruiting";

type SeedTask = {
  title: string;
  area: AreaKey;
  owner: OwnerKey;
  priority: "urgent" | "high" | "medium" | "low";
  taskType: "task" | "follow_up" | "meeting_action_item" | "approval" | "deliverable" | "bug" | "content" | "partnership" | "administrative" | "milestone" | "research";
  source: string;
  note: string;
};

const areaNames: Record<AreaKey, string> = {
  product: "Product & Engineering",
  partnerships: "Partnerships",
  marketing: "Marketing & Growth",
  operations: "Operations",
  fundraising: "Fundraising",
  recruiting: "Team & Recruiting",
};

const ownerEmails: Record<Exclude<OwnerKey, null>, string> = {
  ameera: "ameera@aynahealth.co",
  puloma: "puloma@aynahealth.co",
  eliz: "eliz@aynahealth.co",
};

const recoveredTasks: SeedTask[] = [
  {
    title: "Add Gemini meeting-notes folder shortcut to shared Meeting Recordings",
    area: "operations",
    owner: "ameera",
    priority: "high",
    taskType: "meeting_action_item",
    source: "https://aynahealthinc.slack.com/archives/C0BMCBJEG20/p1787699944794919",
    note: "Puloma followed up on Aug 25 asking whether the shortcut had been added. No completion confirmation was found in Slack.",
  },
  {
    title: "Add recent MVP expenses to the expense tracker, including Twilio",
    area: "operations",
    owner: null,
    priority: "high",
    taskType: "administrative",
    source: "https://aynahealthinc.slack.com/archives/C0BL01L3RNG/p1787548061087709",
    note: "Puloma asked Ameera and Aditi to add recent MVP spend, specifically including Twilio. Left unassigned because responsibility was shared and Aditi has been offboarded.",
  },
  {
    title: "Draft About Us page copy",
    area: "product",
    owner: "ameera",
    priority: "high",
    taskType: "content",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V/p1787697826000000",
    note: "Puloma asked Ameera to draft About Us copy for implementation while brand vetting was underway.",
  },
  {
    title: "Create user feedback form and giveaway feedback flow",
    area: "product",
    owner: "eliz",
    priority: "high",
    taskType: "deliverable",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Team agreed to collect user feedback through a separate form and discussed a giveaway incentive. Eliz took over the feedback form.",
  },
  {
    title: "Create generic contact form for the Ayna site",
    area: "product",
    owner: "eliz",
    priority: "high",
    taskType: "deliverable",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Puloma asked Eliz to quickly create a generic contact form that could be linked from the site.",
  },
  {
    title: "Add advisors section to the About Us page",
    area: "product",
    owner: null,
    priority: "medium",
    taskType: "content",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Originally discussed with Aditi. Left unassigned because Aditi has been offboarded.",
  },
  {
    title: "Fix Ayna domain configuration issue",
    area: "product",
    owner: null,
    priority: "urgent",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Aditi was working on a domain configuration issue on Aug 25. Left unassigned after offboarding so the team can reassign it.",
  },
  {
    title: "Email users stuck awaiting email verification and confirm they can log in",
    area: "product",
    owner: "puloma",
    priority: "high",
    taskType: "follow_up",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Two newly created Ayna accounts were still awaiting email verification; Puloma suggested emailing them directly to confirm access.",
  },
  {
    title: "Fix smaller-brand search relevance",
    area: "product",
    owner: null,
    priority: "high",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Slack repeatedly flagged weak or missing search results for smaller brands including Winx, Neycher, Oboo, Good Kitty and Femigist. Engineering owner left open after Aditi offboarding.",
  },
  {
    title: "Fix global Ask Ayna chat and render responses correctly",
    area: "product",
    owner: null,
    priority: "urgent",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Product audit found the global Ask Ayna widget did not answer normal questions consistently and product chat markdown rendered incorrectly.",
  },
  {
    title: "Fix Browse search speed and Clear Search state",
    area: "product",
    owner: null,
    priority: "urgent",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Product audit found Browse search slow/confusing and clearing the search box did not fully reset filters/results.",
  },
  {
    title: "Fix monthly check-in persistence after refresh or login",
    area: "product",
    owner: null,
    priority: "urgent",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Product audit found monthly check-in changes appeared briefly but disappeared after reload.",
  },
  {
    title: "Fix ecosystem/history data clearing for returning users",
    area: "product",
    owner: null,
    priority: "urgent",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "MVP feedback reported an entire ecosystem/history being cleared. Puloma explicitly asked whether old ecosystems could be restored and history preserved in Supabase.",
  },
  {
    title: "Fix 769–900px navigation dead zone",
    area: "product",
    owner: null,
    priority: "high",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Product audit identified mismatched desktop/mobile breakpoints that leave no header navigation between roughly 769px and 900px.",
  },
  {
    title: "Fix Wishlist overlap on Evidence and broken product imagery",
    area: "product",
    owner: null,
    priority: "high",
    taskType: "bug",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Product audit found the Evidence match card blocking Wishlist and recurring broken/mismatched product images such as Happi Pelvic Floor App.",
  },
  {
    title: "Review PostHog first-page drop-off and Chrome session recordings",
    area: "product",
    owner: "puloma",
    priority: "medium",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
    note: "Aug 26 PostHog results showed the largest funnel drop-off after the first page, especially on Chrome; Puloma suggested reviewing recordings to understand friction.",
  },
  {
    title: "Finalize Buni affiliate-link and discount-code terms",
    area: "partnerships",
    owner: "ameera",
    priority: "high",
    taskType: "partnership",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787670845923689",
    note: "Buni was marked secured, but affiliate-link details and whether to offer a discount code still needed to be worked out in a follow-up meeting.",
  },
  {
    title: "Solve Winx purchase attribution for Walmart and other retail links",
    area: "partnerships",
    owner: null,
    priority: "high",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787597137883599",
    note: "Puloma flagged Winx's question about tracking purchases routed to Walmart/other retailers that Winx could not track itself.",
  },
  {
    title: "Fix Neycher product information in the partnership assets folder",
    area: "partnerships",
    owner: "puloma",
    priority: "high",
    taskType: "partnership",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787426727170509",
    note: "Puloma said the Neycher assets folder had been started but product information still needed to be corrected.",
  },
  {
    title: "Follow up with clinician-owned Tier 1 partners about reviewing or contributing health articles",
    area: "partnerships",
    owner: "ameera",
    priority: "medium",
    taskType: "follow_up",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787773207000000",
    note: "Team discussed asking OB-GYN/physical-therapist-owned Tier 1 partners to review, contribute, or share health articles while also using independent clinicians where appropriate.",
  },
  {
    title: "Decide early-access or discount model for YON E and Clair",
    area: "partnerships",
    owner: null,
    priority: "medium",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60",
    note: "Team discussed how pre-launch partners should offer an Ayna benefit: waitlist-only early access/discount versus all Ayna users.",
  },
  {
    title: "Complete due diligence and pitch docs for Lansinoh, Nyssa, and Elitone",
    area: "partnerships",
    owner: "puloma",
    priority: "high",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60",
    note: "Puloma finished decks but said pitch docs and due diligence still needed to be completed.",
  },
  {
    title: "Follow up on Connect Pelvic Floor Fitness affiliate-link approval",
    area: "partnerships",
    owner: "ameera",
    priority: "medium",
    taskType: "follow_up",
    source: "https://aynahealthinc.slack.com/archives/C0BLS0Y9VSN",
    note: "Connect PFF was still showing In Review; Ameera said she would keep an eye on it and follow up if it remained pending.",
  },
  {
    title: "Secure Ayna-exclusive discount codes and per-product affiliate links from active partners",
    area: "partnerships",
    owner: "ameera",
    priority: "high",
    taskType: "partnership",
    source: "https://aynahealthinc.slack.com/archives/C0BLS0Y9VSN",
    note: "Puloma asked Ameera to follow up with partners in contract drafting for an Ayna-exclusive discount code and affiliate links for each product.",
  },
  {
    title: "Confirm YC update includes LvlUp Labs acceptance and decision to decline",
    area: "fundraising",
    owner: "eliz",
    priority: "medium",
    taskType: "administrative",
    source: "https://aynahealthinc.slack.com/archives/C0BL2PBC3NZ/p1787603089393709",
    note: "Puloma asked whether the YC update mentioned LvlUp Labs; Eliz said she would add it, but no later confirmation was found.",
  },
  {
    title: "Define and document brand-partner vetting criteria",
    area: "partnerships",
    owner: null,
    priority: "high",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BMCBJEG20",
    note: "Multiple all-hands agendas and partnership discussions called for a repeatable vetting process and consistent due-diligence parameters for every brand.",
  },
  {
    title: "Define free vs paid Ayna tiering",
    area: "product",
    owner: null,
    priority: "medium",
    taskType: "research",
    source: "https://aynahealthinc.slack.com/archives/C0BMCBJEG20",
    note: "All-hands agenda explicitly called for determining free and paid version access levels. No completion confirmation was found.",
  },
  {
    title: "Recruit or identify a replacement engineering teammate",
    area: "recruiting",
    owner: null,
    priority: "high",
    taskType: "administrative",
    source: "https://aynahealthinc.slack.com/archives/C0BKEUMCG9M",
    note: "Aditi was fully offboarded on Aug 26 and the team immediately discussed looking for a replacement. Left unassigned for the remaining team to decide ownership.",
  },
];

export async function importRecoveredSlackTasks() {
  const admin = await requireAdmin();
  const workspaceId = admin.workspaceId;

  const allUsers = await db.query.users.findMany({ where: eq(users.workspaceId, workspaceId) });
  const ownerIds: Partial<Record<Exclude<OwnerKey, null>, string>> = {};
  for (const [key, email] of Object.entries(ownerEmails) as [Exclude<OwnerKey, null>, string][]) {
    ownerIds[key] = allUsers.find((user) => user.email.toLowerCase() === email)?.id;
  }

  const projectIds = {} as Record<AreaKey, string>;
  let projectsCreated = 0;
  for (const [area, name] of Object.entries(areaNames) as [AreaKey, string][]) {
    let project = await db.query.projects.findFirst({
      where: and(eq(projects.workspaceId, workspaceId), eq(projects.name, name)),
    });
    if (!project) {
      const id = nanoid();
      await db.insert(projects).values({
        id,
        workspaceId,
        name,
        description: "Operational work recovered from Ayna Slack during the August 2026 tracker rebuild.",
        status: "active",
        priority: area === "product" || area === "partnerships" ? "high" : "medium",
      });
      project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
      projectsCreated += 1;
    }
    if (!project) throw new Error(`Could not create project: ${name}`);
    projectIds[area] = project.id;
  }

  let created = 0;
  let skipped = 0;
  for (const item of recoveredTasks) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.workspaceId, workspaceId), eq(tasks.title, item.title)),
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await db.insert(tasks).values({
      id: nanoid(),
      workspaceId,
      projectId: projectIds[item.area],
      title: item.title,
      description: `${item.note}\n\nRecovered from Slack: ${item.source}`,
      status: "not_started",
      priority: item.priority,
      taskType: item.taskType,
      ownerId: item.owner ? ownerIds[item.owner] ?? null : null,
      createdById: admin.id,
    });
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/settings");

  return { created, skipped, projectsCreated, total: recoveredTasks.length };
}
