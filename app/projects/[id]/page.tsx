import { notFound } from "next/navigation";
import { CalendarDays, CircleAlert, UserRound } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getActiveUsers, getProjectWithTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { ProjectTaskWorkspace } from "@/components/project-task-workspace";
import { QuickAddTask } from "@/components/quick-add-task";
import { Card, MetricCard, ProgressRing, StackedDistribution, humanize } from "@/components/visuals";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  const [data, people] = await Promise.all([getProjectWithTasks(id), getActiveUsers()]);
  if (!data) notFound();
  const { project, tasks } = data;

  const done = tasks.filter((task) => task.status === "completed").length;
  const overdue = tasks.filter((task) => task.dueAt && task.dueAt < new Date() && !["completed", "cancelled"].includes(task.status)).length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const statusData = ["backlog", "not_started", "in_progress", "waiting", "blocked", "needs_review", "completed"].map((status) => ({
    label: status,
    value: tasks.filter((task) => task.status === status).length,
  }));

  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
    project: { id: project.id, name: project.name },
    owner: task.owner ? { id: task.owner.id, name: task.owner.name } : null,
  }));

  return (
    <AppShell active="Projects" currentUser={user}>
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-7">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Projects / {project.workstream?.name ?? "General"}</p>
          <h1 className="font-voice text-3xl sm:text-4xl font-semibold">{project.name}</h1>
          {project.description && <p className="text-sm text-text-secondary mt-2 leading-6">{project.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><UserRound size={13} />{project.owner?.name ?? "No project owner"}</span>
            <span className="flex items-center gap-1.5 capitalize"><CircleAlert size={13} />{humanize(project.health)}</span>
            {project.dueDate && <span className="flex items-center gap-1.5"><CalendarDays size={13} />Due {project.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
          </div>
        </div>
        <QuickAddTask projectId={project.id} workstreamId={project.workstreamId ?? undefined} label="Add project task" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Complete" value={`${progress}%`} detail={`${done} of ${tasks.length} tasks`} tone="sage" />
        <MetricCard label="Open tasks" value={tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length} tone="accent" />
        <MetricCard label="Overdue" value={overdue} tone="brick" />
        <MetricCard label="Blocked" value={blocked} tone="plum" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
        <Card title="Progress" subtitle="Overall project completion." className="lg:col-span-4">
          <div className="flex justify-center py-1"><ProgressRing value={progress} label={`${done} completed`} size={132} /></div>
        </Card>
        <Card title="Work distribution" subtitle="Where the remaining work currently sits." className="lg:col-span-5">
          <StackedDistribution data={statusData} />
        </Card>
        <Card title="Milestones" subtitle="Important project dates." className="lg:col-span-3">
          <div className="space-y-3">
            {project.milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${milestone.completed ? "bg-sage" : "bg-accent"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium break-words">{milestone.title}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{milestone.dueDate ? milestone.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}</div>
                </div>
              </div>
            ))}
            {project.milestones.length === 0 && <p className="text-sm text-text-muted">No milestones yet.</p>}
          </div>
        </Card>
      </div>

      <ProjectTaskWorkspace
        tasks={serialized}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
        project={{ id: project.id, name: project.name }}
      />
    </AppShell>
  );
}
