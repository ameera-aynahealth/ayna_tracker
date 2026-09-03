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

  try {
    const startedAt = Date.now();
    const [result, oneHourResult] = await Promise.all([
      processReminderCycle(),
      processOneHourDeadlineEmails(),
    ]);
    console.info("[cron:reminders]", {
      ...result,
      ...oneHourResult,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ success: true, ...result, ...oneHourResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown reminder error";
    console.error("[cron:reminders:error]", message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
