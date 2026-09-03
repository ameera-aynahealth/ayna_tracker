import { processOneHourDeadlineEmails } from "@/lib/one-hour-reminders";
import { processReminderCycle } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!configuredSecret || authHeader !== `Bearer ${configuredSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const [dailyOutcome, oneHourOutcome] = await Promise.allSettled([
    processReminderCycle(),
    processOneHourDeadlineEmails(),
  ]);

  const dailyResult = dailyOutcome.status === "fulfilled"
    ? dailyOutcome.value
    : { dailyReminderError: dailyOutcome.reason instanceof Error ? dailyOutcome.reason.message : "Unknown daily reminder error" };

  const oneHourResult = oneHourOutcome.status === "fulfilled"
    ? oneHourOutcome.value
    : { oneHourReminderError: oneHourOutcome.reason instanceof Error ? oneHourOutcome.reason.message : "Unknown one-hour reminder error" };

  const success = dailyOutcome.status === "fulfilled" || oneHourOutcome.status === "fulfilled";

  console.info("[cron:reminders]", {
    success,
    ...dailyResult,
    ...oneHourResult,
    durationMs: Date.now() - startedAt,
  });

  if (!success) {
    console.error("[cron:reminders:error]", { ...dailyResult, ...oneHourResult });
  }

  return Response.json(
    { success, ...dailyResult, ...oneHourResult },
    { status: success ? 200 : 500 },
  );
}
