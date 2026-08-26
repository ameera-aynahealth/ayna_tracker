import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { importRecoveredWorkTasks } from "@/lib/actions/slack-task-import";

export default async function SlackRecoveryPage() {
  const user = await requireAdmin();

  async function runRecovery() {
    "use server";
    await importRecoveredWorkTasks();
    redirect("/tasks");
  }

  return (
    <AppShell active="Settings" currentUser={user}>
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">One-time recovery</p>
        <h1 className="font-voice text-3xl font-semibold">Recover old Ayna tasks</h1>
        <p className="text-sm text-text-secondary mt-2 leading-6">
          This creates a starter backlog from actionable work recovered from Ayna Slack, the old Asana lists, and current partnership emails. Clear completed or cancelled work is excluded. Tasks that belonged to Aditi are left unassigned so the remaining team can decide who should own them.
        </p>

        <div className="mt-6 border border-border bg-surface p-5" style={{ borderRadius: "24px 12px 12px 12px" }}>
          <h2 className="font-voice text-xl font-semibold">What will be added</h2>
          <p className="text-sm text-text-secondary mt-1 leading-6">
            A recovered starter backlog across Product & Engineering, Partnerships, MVP & User Research, Operations, Legal & Compliance, Fundraising, Marketing, and Team & Recruiting. Existing tasks with the same title are skipped, so running recovery again will not create duplicates.
          </p>
          <p className="text-xs text-text-muted mt-3">
            Each recovered task includes context about where it came from. Old due dates are preserved when they were explicit in Asana so overdue work is easy to spot.
          </p>

          <form action={runRecovery} className="mt-5">
            <button type="submit" className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
              Import recovered tasks
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
