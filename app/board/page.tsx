import { getOrCreateCurrentUser } from "@/lib/auth";
import { ensureSep3MeetingTasks } from "@/lib/sep3-meeting-task-bootstrap";
import { ensureSep3AppTaskProjectMapping } from "@/lib/sep3-app-project-repair";
import { getAllTasks, getMyWorkBuckets } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { ScopedKanbanBoard } from "@/components/scoped-kanban-board";

export default async function BoardPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  await ensureSep3MeetingTasks();
  await ensureSep3AppTaskProjectMapping();

  const [tasks, mine] = await Promise.all([
    getAllTasks({ limit: 1000 }),
    getMyWorkBuckets(user.id),
  ]);

  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
    project: task.project ? { id: task.project.id, name: task.project.name } : null,
    owner: task.owner ? { id: task.owner.id, name: task.owner.name } : null,
  }));

  return (
    <AppShell active="Board" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Visual workflow</p>
        <h1 className="font-voice text-3xl font-semibold">Board</h1>
        <p className="text-sm text-text-secondary mt-1">Drag work between standardized statuses and switch between your workload and the whole team.</p>
      </div>
      <ScopedKanbanBoard tasks={serialized} myTaskIds={mine.all.map((task) => task.id)} />
    </AppShell>
  );
}
