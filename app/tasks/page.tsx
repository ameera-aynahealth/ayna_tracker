import { getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveProjects, getActiveUsers, getAllTasks, getMyWorkBuckets } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { SimpleTaskBoard } from "@/components/simple-task-board";

export default async function TasksPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [mine, allTasks, people, projects] = await Promise.all([
    getMyWorkBuckets(user.id),
    getAllTasks({ limit: 1000 }),
    getActiveUsers(),
    getActiveProjects(),
  ]);

  const serialize = (task: (typeof allTasks)[number]) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    project: task.project ? { id: task.project.id, name: task.project.name } : null,
    owner: task.owner ? { id: task.owner.id, name: task.owner.name } : null,
  });

  return (
    <AppShell active="Tasks" currentUser={user}>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Work</p>
        <h1 className="font-voice text-3xl font-semibold">Tasks</h1>
        <p className="text-sm text-text-secondary mt-1">Your work first. Team and full-workspace views are one click away.</p>
      </div>

      <SimpleTaskBoard
        mine={mine.all.map((task) => serialize(task as (typeof allTasks)[number]))}
        all={allTasks.map(serialize)}
        currentUserId={user.id}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShell>
  );
}
