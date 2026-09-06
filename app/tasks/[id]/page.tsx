import { notFound } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveProjects, getActiveUsers, getTaskDetail } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { TaskDetailPanel } from "@/components/task-detail-panel";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [task, people, projects] = await Promise.all([getTaskDetail(id), getActiveUsers(), getActiveProjects()]);
  if (!task) notFound();

  return (
    <AppShell active="Tasks" currentUser={user}>
      <div className="max-w-6xl mx-auto flex justify-end mb-3">
        <TaskDeleteButton taskId={task.id} archived={Boolean(task.archivedAt)} />
      </div>
      <TaskDetailPanel
        task={task}
        currentUser={{ id: user.id, role: user.role }}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      />
    </AppShell>
  );
}
