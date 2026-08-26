"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects, tasks, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

type OwnerKey = "ameera" | "puloma" | "eliz" | null;
type AreaKey = "product" | "partnerships" | "marketing" | "operations" | "fundraising" | "recruiting" | "mvp" | "legal";
type TaskStatus = "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review" | "completed" | "cancelled";

type SeedTask = {
  title: string;
  area: AreaKey;
  owner: OwnerKey;
  priority: "urgent" | "high" | "medium" | "low";
  taskType: "task" | "follow_up" | "meeting_action_item" | "approval" | "deliverable" | "bug" | "content" | "partnership" | "administrative" | "milestone" | "research";
  source: string;
  note: string;
  dueAt?: string;
  status?: TaskStatus;
  waitingOnName?: string;
};

const areaNames: Record<AreaKey, string> = {
  product: "Product & Engineering",
  partnerships: "Partnerships",
  marketing: "Marketing & Growth",
  operations: "Operations",
  fundraising: "Fundraising",
  recruiting: "Team & Recruiting",
  mvp: "MVP & User Research",
  legal: "Legal & Compliance",
};

const ownerEmails: Record<Exclude<OwnerKey, null>, string> = {
  ameera: "ameera@aynahealth.co",
  puloma: "puloma@aynahealth.co",
  eliz: "eliz@aynahealth.co",
};

const channels = {
  product: "https://aynahealthinc.slack.com/archives/C0BKY7YLV6V",
  partnerships: "https://aynahealthinc.slack.com/archives/C0BL01BMM60",
  marketing: "https://aynahealthinc.slack.com/archives/C0BLS0Y9VSN",
  meetings: "https://aynahealthinc.slack.com/archives/C0BMCBJEG20",
  financials: "https://aynahealthinc.slack.com/archives/C0BL01L3RNG",
  fundraising: "https://aynahealthinc.slack.com/archives/C0BL2PBC3NZ",
  allHands: "https://aynahealthinc.slack.com/archives/C0BKEUMCG9M",
};

const asanaSource = "Legacy Asana task list supplied during tracker recovery";
const gmailSource = "Ameera's Ayna Gmail partnership inbox reviewed during tracker recovery";

const recoveredTasks: SeedTask[] = [
  { title: "Add Gemini meeting-notes folder shortcut to shared Meeting Recordings", area: "operations", owner: "ameera", priority: "high", taskType: "meeting_action_item", source: "https://aynahealthinc.slack.com/archives/C0BMCBJEG20/p1787699944794919", note: "Puloma followed up on Aug 25 asking whether the shortcut had been added. No completion confirmation was found in Slack." },
  { title: "Add recent MVP expenses to the expense tracker, including Twilio", area: "operations", owner: null, priority: "high", taskType: "administrative", source: "https://aynahealthinc.slack.com/archives/C0BL01L3RNG/p1787548061087709", note: "Puloma asked Ameera and Aditi to add recent MVP spend, specifically including Twilio. Left unassigned because responsibility was shared and Aditi has been offboarded." },
  { title: "Draft About Us page copy", area: "product", owner: "ameera", priority: "high", taskType: "content", source: channels.product, note: "Puloma asked Ameera to draft About Us copy for implementation while brand vetting was underway." },
  { title: "Create user feedback form and giveaway feedback flow", area: "product", owner: "eliz", priority: "high", taskType: "deliverable", source: channels.product, note: "Team agreed to collect user feedback through a separate form and discussed a giveaway incentive. Eliz took over the feedback form." },
  { title: "Create generic contact form for the Ayna site", area: "product", owner: "eliz", priority: "high", taskType: "deliverable", source: channels.product, note: "Puloma asked Eliz to quickly create a generic contact form that could be linked from the site." },
  { title: "Add advisors section to the About Us page", area: "product", owner: null, priority: "medium", taskType: "content", source: channels.product, note: "Originally discussed with Aditi. Left unassigned because Aditi has been offboarded." },
  { title: "Fix Ayna domain configuration issue", area: "product", owner: null, priority: "urgent", taskType: "bug", source: channels.product, note: "Aditi was working on a domain configuration issue on Aug 25. Left unassigned after offboarding so the team can reassign it." },
  { title: "Email users stuck awaiting email verification and confirm they can log in", area: "product", owner: "puloma", priority: "high", taskType: "follow_up", source: channels.product, note: "Two newly created Ayna accounts were still awaiting email verification; Puloma suggested emailing them directly to confirm access." },
  { title: "Fix smaller-brand search relevance", area: "product", owner: null, priority: "high", taskType: "bug", source: channels.product, note: "Slack repeatedly flagged weak or missing search results for smaller brands including Winx, Neycher, Oboo, Good Kitty and Femigist. Engineering owner left open after Aditi offboarding." },
  { title: "Fix global Ask Ayna chat and render responses correctly", area: "product", owner: null, priority: "urgent", taskType: "bug", source: channels.product, note: "Product audit found the global Ask Ayna widget did not answer normal questions consistently and product chat markdown rendered incorrectly." },
  { title: "Fix Browse search speed and Clear Search state", area: "product", owner: null, priority: "urgent", taskType: "bug", source: channels.product, note: "Product audit found Browse search slow/confusing and clearing the search box did not fully reset filters/results." },
  { title: "Fix monthly check-in persistence after refresh or login", area: "product", owner: null, priority: "urgent", taskType: "bug", source: channels.product, note: "Product audit found monthly check-in changes appeared briefly but disappeared after reload." },
  { title: "Fix ecosystem/history data clearing for returning users", area: "product", owner: null, priority: "urgent", taskType: "bug", source: channels.product, note: "MVP feedback reported an entire ecosystem/history being cleared. Puloma explicitly asked whether old ecosystems could be restored and history preserved in Supabase." },
  { title: "Fix 769–900px navigation dead zone", area: "product", owner: null, priority: "high", taskType: "bug", source: channels.product, note: "Product audit identified mismatched desktop/mobile breakpoints that leave no header navigation between roughly 769px and 900px." },
  { title: "Fix Wishlist overlap on Evidence and broken product imagery", area: "product", owner: null, priority: "high", taskType: "bug", source: channels.product, note: "Product audit found the Evidence match card blocking Wishlist and recurring broken/mismatched product images such as Happi Pelvic Floor App." },
  { title: "Review PostHog first-page drop-off and Chrome session recordings", area: "product", owner: "puloma", priority: "medium", taskType: "research", source: channels.product, note: "Aug 26 PostHog results showed the largest funnel drop-off after the first page, especially on Chrome; Puloma suggested reviewing recordings to understand friction." },
  { title: "Finalize Buni affiliate-link and discount-code terms", area: "partnerships", owner: "ameera", priority: "high", taskType: "partnership", source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787670845923689", note: "Buni was marked secured, but affiliate-link details and whether to offer a discount code still needed to be worked out in a follow-up meeting." },
  { title: "Solve Winx purchase attribution for Walmart and other retail links", area: "partnerships", owner: null, priority: "high", taskType: "research", source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787597137883599", note: "Puloma flagged Winx's question about tracking purchases routed to Walmart/other retailers that Winx could not track itself." },
  { title: "Fix Neycher product information in the partnership assets folder", area: "partnerships", owner: "puloma", priority: "high", taskType: "partnership", source: "https://aynahealthinc.slack.com/archives/C0BL01BMM60/p1787426727170509", note: "Puloma said the Neycher assets folder had been started but product information still needed to be corrected." },
  { title: "Follow up with clinician-owned Tier 1 partners about reviewing or contributing health articles", area: "partnerships", owner: "ameera", priority: "medium", taskType: "follow_up", source: channels.partnerships, note: "Team discussed asking OB-GYN/physical-therapist-owned Tier 1 partners to review, contribute, or share health articles while also using independent clinicians where appropriate." },
  { title: "Decide early-access or discount model for YON E and Clair", area: "partnerships", owner: null, priority: "medium", taskType: "research", source: channels.partnerships, note: "Team discussed how pre-launch partners should offer an Ayna benefit: waitlist-only early access/discount versus all Ayna users." },
  { title: "Complete due diligence and pitch docs for Lansinoh, Nyssa, and Elitone", area: "partnerships", owner: "puloma", priority: "high", taskType: "research", source: channels.partnerships, note: "Puloma finished decks but said pitch docs and due diligence still needed to be completed." },
  { title: "Follow up on Connect Pelvic Floor Fitness affiliate-link approval", area: "partnerships", owner: "ameera", priority: "medium", taskType: "follow_up", source: channels.marketing, note: "Connect PFF was still showing In Review; Ameera said she would keep an eye on it and follow up if it remained pending." },
  { title: "Secure Ayna-exclusive discount codes and per-product affiliate links from active partners", area: "partnerships", owner: "ameera", priority: "high", taskType: "partnership", source: channels.marketing, note: "Puloma asked Ameera to follow up with partners in contract drafting for an Ayna-exclusive discount code and affiliate links for each product." },
  { title: "Confirm YC update includes LvlUp Labs acceptance and decision to decline", area: "fundraising", owner: "eliz", priority: "medium", taskType: "administrative", source: "https://aynahealthinc.slack.com/archives/C0BL2PBC3NZ/p1787603089393709", note: "Puloma asked whether the YC update mentioned LvlUp Labs; Eliz said she would add it, but no later confirmation was found." },
  { title: "Define and document brand-partner vetting criteria", area: "partnerships", owner: null, priority: "high", taskType: "research", source: channels.meetings, note: "Multiple all-hands agendas and partnership discussions called for a repeatable vetting process and consistent due-diligence parameters for every brand." },
  { title: "Define free vs paid Ayna tiering", area: "product", owner: null, priority: "medium", taskType: "research", source: channels.meetings, note: "All-hands agenda explicitly called for determining free and paid version access levels. No completion confirmation was found." },
  { title: "Recruit or identify a replacement engineering teammate", area: "recruiting", owner: null, priority: "high", taskType: "administrative", source: channels.allHands, note: "Aditi was fully offboarded on Aug 26 and the team immediately discussed looking for a replacement. Left unassigned for the remaining team to decide ownership." },

  { title: "Set up discovery call with Shruti Gajjar and demo the platform", area: "mvp", owner: "puloma", priority: "high", taskType: "follow_up", source: asanaSource, note: "Legacy Asana task said to wait for Shruti's response, set up a discovery call, and demo the platform. No Slack completion evidence was found.", dueAt: "2026-08-21" },
  { title: "Call Deanna Oliver to onboard her as an MVP user", area: "mvp", owner: null, priority: "high", taskType: "follow_up", source: asanaSource, note: "Legacy Asana onboarding task. No Slack completion evidence was found; left unassigned.", dueAt: "2026-07-30" },
  { title: "Follow up with Amelia for MVP feedback", area: "mvp", owner: null, priority: "medium", taskType: "follow_up", source: asanaSource, note: "Legacy Asana follow-up. No Slack completion evidence was found; left unassigned.", dueAt: "2026-08-07" },
  { title: "Follow up with Kimari for MVP feedback", area: "mvp", owner: null, priority: "medium", taskType: "follow_up", source: asanaSource, note: "Legacy Asana follow-up. No Slack completion evidence was found; left unassigned.", dueAt: "2026-08-21" },
  { title: "Track Sukriti's MVP feedback and resulting changes", area: "mvp", owner: "puloma", priority: "medium", taskType: "meeting_action_item", source: asanaSource, note: "Legacy Asana task assigned to Puloma. No clear Slack completion evidence was found." },
  { title: "Add Substack signup to the waitlist signup flow", area: "marketing", owner: null, priority: "medium", taskType: "deliverable", source: asanaSource, note: "Asana originally said to auto-add waitlist members to Substack. Slack later established there was no usable Substack API for this, so the agreed fallback was to point new waitlist signups directly to a Substack embed/signup form. This task captures the unresolved implementation rather than the obsolete API approach." },
  { title: "Create an adaptive health information library for users", area: "product", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy Product Development roadmap task. No completion evidence was found." },
  { title: "Add email notifications for meaningful Ayna platform updates", area: "product", owner: null, priority: "medium", taskType: "deliverable", source: asanaSource, note: "Legacy Product Development task. This refers to the consumer Ayna platform, not tracker reminder emails." },
  { title: "Implement option to import wearable data", area: "product", owner: null, priority: "medium", taskType: "deliverable", source: asanaSource, note: "Legacy Product Development roadmap task. No completion evidence was found." },
  { title: "Explore text notifications for newly applicable products", area: "product", owner: null, priority: "low", taskType: "research", source: asanaSource, note: "Legacy Product Development task. Twilio texting exists for outreach, but no evidence was found that product-triggered notifications were implemented." },
  { title: "Define how Ayna should account for brand loyalty in recommendations", area: "product", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy Product Development research item. No completion evidence was found." },
  { title: "Research BAA costs and when Ayna would need one", area: "legal", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy legal/product research task. No completion evidence was found." },
  { title: "Research agentic personalization tools for Ayna", area: "product", owner: null, priority: "high", taskType: "research", source: asanaSource, note: "Legacy Product Development task marked high priority. No completion evidence was found." },
  { title: "Review the LLM guardrails reel and capture relevant safeguards", area: "product", owner: "puloma", priority: "low", taskType: "research", source: asanaSource, note: "Legacy research task assigned to Puloma. No completion evidence was found." },
  { title: "Research whether women outside the US can use Ayna", area: "product", owner: "puloma", priority: "medium", taskType: "research", source: asanaSource, note: "Legacy international-access research task assigned to Puloma." },
  { title: "Research whether Ayna could participate in insurance plans outside the US", area: "product", owner: "puloma", priority: "medium", taskType: "research", source: asanaSource, note: "Legacy international insurance research task assigned to Puloma." },
  { title: "Follow up with Cooley / Elizabeth", area: "legal", owner: null, priority: "medium", taskType: "follow_up", source: asanaSource, note: "Legacy legal follow-up. No completion evidence was found; left unassigned." },
  { title: "Review LegalZoom options and Stripe discount before legal setup decisions", area: "legal", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy legal task noting that Stripe had a LegalZoom discount. No completion evidence was found." },
  { title: "Apply to the Healthcare Innovation Competition", area: "fundraising", owner: null, priority: "medium", taskType: "administrative", source: asanaSource, note: "Legacy fundraising/accelerator task with a Dec 1 deadline.", dueAt: "2026-12-01" },
  { title: "Follow up on Speedrun / a16z after Ashley's connection", area: "fundraising", owner: "puloma", priority: "low", taskType: "follow_up", source: asanaSource, note: "Legacy fundraising task assigned to Puloma and explicitly waiting on Ashley to connect the team with an a16z employee.", status: "waiting", waitingOnName: "Ashley" },
  { title: "Complete Founders Inc application", area: "fundraising", owner: "puloma", priority: "high", taskType: "administrative", source: asanaSource, note: "Legacy fundraising task assigned to Puloma. No completion evidence was found." },
  { title: "Complete ODF application and add it to the funding spreadsheet", area: "fundraising", owner: "puloma", priority: "medium", taskType: "administrative", source: asanaSource, note: "Combined duplicate legacy Asana ODF tasks: complete the application and make sure it is recorded in the spreadsheet." },
  { title: "Research Menlo Anthology Fund with Anthropic", area: "fundraising", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy fundraising opportunity. No completion evidence was found." },
  { title: "Research Menlo Fellowship", area: "fundraising", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy fundraising opportunity. No completion evidence was found." },
  { title: "Update funding application spreadsheet with aligned funds and accelerators", area: "fundraising", owner: null, priority: "medium", taskType: "administrative", source: asanaSource, note: "Legacy fundraising task to keep the application pipeline current." },
  { title: "Research FC Build accelerator", area: "fundraising", owner: null, priority: "medium", taskType: "research", source: asanaSource, note: "Legacy accelerator task. No completion evidence was found." },
  { title: "Set up DocSend perk through Stripe Atlas", area: "fundraising", owner: "puloma", priority: "high", taskType: "administrative", source: asanaSource, note: "Legacy fundraising operations task assigned to Puloma." },
  { title: "Revise fundraising deck before restarting the raise", area: "fundraising", owner: "puloma", priority: "high", taskType: "deliverable", source: asanaSource, note: "Legacy task explicitly marked DO BEFORE RESTARTING RAISING." },
  { title: "Evaluate setting up a friends-and-family round", area: "fundraising", owner: "puloma", priority: "medium", taskType: "research", source: asanaSource, note: "Legacy fundraising task assigned to Puloma.", dueAt: "2026-08-21" },
  { title: "Set up call with Erika's connection", area: "fundraising", owner: "puloma", priority: "medium", taskType: "follow_up", source: asanaSource, note: "Legacy networking/fundraising task assigned to Puloma. No completion evidence was found.", dueAt: "2026-08-03" },
  { title: "Follow up with Riya Sharma", area: "fundraising", owner: "puloma", priority: "medium", taskType: "follow_up", source: asanaSource, note: "Legacy networking follow-up assigned to Puloma. No completion evidence was found.", dueAt: "2026-07-31" },

  { title: "Complete Elitone affiliate signup and accept affiliate terms", area: "partnerships", owner: "ameera", priority: "high", taskType: "partnership", source: gmailSource, note: "Gloria Kolb replied on Aug 26 asking Ayna to sign up through Elitone's affiliate program, agree to the terms, and choose login credentials. No later completion email was found." },
  { title: "Submit Corgi Cafe venue request form", area: "marketing", owner: null, priority: "medium", taskType: "administrative", source: gmailSource, note: "Madeline Ford replied on Aug 26 that the team should fill out Corgi's event-space request form. Left unassigned because the thread is shared with Eliz." },
  { title: "Set up LOLA affiliate link through Levanta / Amazon Creator Connections", area: "partnerships", owner: "ameera", priority: "high", taskType: "partnership", source: gmailSource, note: "LOLA's team said the best affiliate-link route is Amazon Creator Connections via Levanta. They also confirmed they are happy to reshare Ayna content on stories." },
  { title: "Complete Proov affiliate enrollment with Alyssa", area: "partnerships", owner: "ameera", priority: "high", taskType: "partnership", source: gmailSource, note: "Amy Beckley introduced Alyssa Stouffer to help Ayna get enrolled in Proov's affiliate program. No completion evidence was found." },
  { title: "Follow up with Alubri on partnership next steps after the meeting", area: "partnerships", owner: "ameera", priority: "medium", taskType: "follow_up", source: gmailSource, note: "Mariah Eckhardt sent a positive post-meeting note saying Alubri was excited about what Ayna is building. Keep a concrete next-step follow-up in the tracker rather than leaving the thread implicit." },
  { title: "Route Origin partnership outreach to David while Carine is OOO", area: "partnerships", owner: "ameera", priority: "medium", taskType: "follow_up", source: gmailSource, note: "Carine Carmy's OOO message directed partnership matters to david@theoriginway.com. No later handoff was found in the reviewed inbox." },
];

function dueDate(value?: string) {
  return value ? new Date(`${value}T17:00:00-04:00`) : null;
}

export async function importRecoveredWorkTasks() {
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
    let project = await db.query.projects.findFirst({ where: and(eq(projects.workspaceId, workspaceId), eq(projects.name, name)) });
    if (!project) {
      const id = nanoid();
      await db.insert(projects).values({ id, workspaceId, name, description: "Operational work recovered from Ayna's legacy task systems, Slack, and Gmail during the August 2026 tracker rebuild.", status: "active", priority: area === "product" || area === "partnerships" ? "high" : "medium" });
      project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
      projectsCreated += 1;
    }
    if (!project) throw new Error(`Could not create project: ${name}`);
    projectIds[area] = project.id;
  }

  let created = 0;
  let skipped = 0;
  for (const item of recoveredTasks) {
    const existing = await db.query.tasks.findFirst({ where: and(eq(tasks.workspaceId, workspaceId), eq(tasks.title, item.title)) });
    if (existing) {
      skipped += 1;
      continue;
    }

    const dueAt = dueDate(item.dueAt);
    await db.insert(tasks).values({
      id: nanoid(),
      workspaceId,
      projectId: projectIds[item.area],
      title: item.title,
      description: `${item.note}\n\nRecovered source: ${item.source}`,
      status: item.status ?? "not_started",
      priority: item.priority,
      taskType: item.taskType,
      ownerId: item.owner ? ownerIds[item.owner] ?? null : null,
      createdById: admin.id,
      dueAt,
      originalDueAt: dueAt,
      waitingOnName: item.waitingOnName ?? null,
      waitingSince: item.status === "waiting" ? new Date() : null,
    });
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/settings");

  return { created, skipped, projectsCreated, total: recoveredTasks.length };
}
