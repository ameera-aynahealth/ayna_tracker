import { getOrCreateCurrentUser } from "@/lib/auth";
import { ensureSep3MeetingTasks } from "@/lib/sep3-meeting-task-bootstrap";
import { ensureSep3AppTaskProjectMapping } from "@/lib/sep3-app-project-repair";
import { getActiveProjects, getActiveUsers, getAllTasks, getMyWorkBuckets } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { SimpleTaskBoard } from "@/components/simple-task-board";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  await ensureSep3MeetingTasks();
  await ensureSep3AppTaskProjectMapping();

  const [params, mine, allTasks, people, projects] = await Promise.all([
    searchParams,
    getMyWorkBuckets(user.id),
    getAllTasks({ limit: 1000 }),
    getActiveUsers(),
    getActiveProjects(),
  ]);
  const defaultTab = params.scope === "team" ? "team" : params.scope === "all" ? "all" : "mine";

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
        <p className="text-sm text-text-secondary mt-1">Switch between your work, everyone's open work, or the full task history.</p>
      </div>

      <SimpleTaskBoard
        mine={mine.all.map((task) => serialize(task as (typeof allTasks)[number]))}
        all={allTasks.map(serialize)}
        currentUserId={user.id}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        defaultTab={defaultTab}
      />
    </AppShell>
  );
}
