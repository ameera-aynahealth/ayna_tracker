import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { importRecoveredSlackTasks } from "@/lib/actions/slack-task-import";

export default async function SlackRecoveryPage() {
  const user = await requireAdmin();

  async function runRecovery() {
    "use server";
    await importRecoveredSlackTasks();
    redirect("/tasks");
  }

  return (
    <AppShell active="Settings" currentUser={user}>
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">One-time recovery</p>
        <h1 className="font-voice text-3xl font-semibold">Recover tasks from Slack</h1>
        <p className="text-sm text-text-secondary mt-2 leading-6">
          This creates a starter backlog from actionable work found across Ayna Slack during the tracker rebuild. It is intentionally conservative: clear completed or cancelled conversations were excluded, and work that belonged only to Aditi is left unassigned for the remaining team to review.
        </p>

        <div className="mt-6 border border-border bg-surface p-5" style={{ borderRadius: "24px 12px 12px 12px" }}>
          <h2 className="font-voice text-xl font-semibold">What will be added</h2>
          <p className="text-sm text-text-secondary mt-1 leading-6">
            Up to 28 recovered tasks across Product & Engineering, Partnerships, Operations, Fundraising, and Team & Recruiting. Existing tasks with the same title are skipped, so running the recovery again will not duplicate them.
          </p>
          <p className="text-xs text-text-muted mt-3">
            Source context is saved inside each task description with a link back to the relevant Slack channel or message.
          </p>

          <form action={runRecovery} className="mt-5">
            <button type="submit" className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
              Import recovered Slack tasks
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
