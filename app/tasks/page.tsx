import { getOrCreateCurrentUser } from "@/lib/auth";
import { getAllTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskRow } from "@/components/task-row";

export default async function AllTasksPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const allTasks = await getAllTasks();

  return (
    <AppShell active="All Tasks" currentUserName={user.name}>
      <h1 className="font-voice text-2xl font-semibold mb-1">All tasks</h1>
      <p className="text-sm text-text-secondary mb-6">{allTasks.length} tasks across the workspace</p>

      <div className="border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
        {allTasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {allTasks.length === 0 && (
          <div className="p-8 text-center text-sm text-text-secondary">No tasks yet. Create your first task.</div>
        )}
      </div>
    </AppShell>
  );
}
