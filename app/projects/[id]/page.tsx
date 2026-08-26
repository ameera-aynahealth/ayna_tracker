import { getOrCreateCurrentUser } from "@/lib/auth";
import { getProjectWithTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskRow } from "@/components/task-row";
import { QuickAddTask } from "@/components/quick-add-task";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const data = await getProjectWithTasks(id);
  if (!data) notFound();
  const { project, tasks } = data;

  const done = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter((t) => t.dueAt && t.dueAt < new Date() && t.status !== "completed" && t.status !== "cancelled").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;

  return (
    <AppShell active="Projects" currentUserName={user.name}>
      <div className="mb-6">
        <h1 className="font-voice text-2xl font-semibold mb-1">{project.name}</h1>
        {project.description && <p className="text-sm text-text-secondary mb-2">{project.description}</p>}
        <p className="text-sm text-text-muted">
          {done}/{tasks.length} tasks complete
          {tasks.length > 0 && <> &mdash; {Math.round((done / tasks.length) * 100)}%</>}
          {overdue > 0 && <> &middot; {overdue} overdue</>}
          {blocked > 0 && <> &middot; {blocked} blocked</>}
        </p>
      </div>

      <div className="mb-4">
        <QuickAddTask projectId={project.id} />
      </div>

      <div className="border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <div className="p-8 text-center text-sm text-text-secondary">No tasks in this project yet.</div>
        )}
      </div>
    </AppShell>
  );
}
