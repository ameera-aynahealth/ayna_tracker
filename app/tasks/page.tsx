import { getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveProjects, getActiveUsers, getAllTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskExplorer } from "@/components/task-explorer";

export default async function AllTasksPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const [allTasks, people, projects] = await Promise.all([getAllTasks(), getActiveUsers(), getActiveProjects()]);

  const serialized = allTasks.map((task) => ({
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
    <AppShell active="All Tasks" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Workspace database</p>
        <h1 className="font-voice text-3xl font-semibold">All Tasks</h1>
        <p className="text-sm text-text-secondary mt-1">Search, filter, sort, preview, and bulk-update work without reloading the page.</p>
      </div>
      <TaskExplorer
        tasks={serialized}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShell>
  );
}
