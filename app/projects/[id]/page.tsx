import { notFound } from "next/navigation";
import { CalendarDays, CircleAlert, UserRound } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { ensureBestVersionMasterList } from "@/lib/best-version-bootstrap";
import { ensureRecentMeetingEventTasks } from "@/lib/recent-meeting-event-bootstrap";
import { ensureGrantApplicationTasks } from "@/lib/grant-applications-bootstrap";
import { getActiveUsers, getMyWorkBuckets, getProjectWithTasks } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { ProjectTaskWorkspace } from "@/components/project-task-workspace";
import { QuickAddTask } from "@/components/quick-add-task";
import { ProjectDeleteButton } from "@/components/project-delete-button";
import { Card, MetricCard, ProgressRing, StackedDistribution, humanize } from "@/components/visuals";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

  await ensureBestVersionMasterList(id);
  await ensureRecentMeetingEventTasks(id);
  await ensureGrantApplicationTasks();

  const [data, people, myWork] = await Promise.all([
    getProjectWithTasks(id),
    getActiveUsers(),
    getMyWorkBuckets(user.id),
  ]);
  if (!data) notFound();
  const { project, tasks } = data;
  const myTaskIds = new Set(myWork.all.filter((task) => task.projectId === id).map((task) => task.id));

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
      {project.archivedAt && (
        <div className="mb-5 rounded-2xl border border-gold/20 bg-gold-soft p-4 text-sm text-gold-text flex flex-wrap items-center justify-between gap-3">
          <span>This project is in Archive and is hidden from everyday project views.</span>
          <ProjectDeleteButton projectId={project.id} archived />
        </div>
      )}

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
        <div className="flex flex-wrap items-center gap-2">
          {!project.archivedAt && <QuickAddTask projectId={project.id} workstreamId={project.workstreamId ?? undefined} label="Add project task" />}
          <ProjectDeleteButton projectId={project.id} archived={Boolean(project.archivedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Complete" value={`${progress}%`} detail={`${done} of ${tasks.length} tasks`} tone="sage" />
        <MetricCard label="Open tasks" value={tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length} tone="accent" />
        <MetricCard label="Overdue" value={overdue} tone="brick" />
        <MetricCard label="Blocked" value={blocked} tone="plum" />
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4 mb-6">
        <Card title="Progress" subtitle="Overall project completion.">
          <div className="flex items-center gap-5">
            <ProgressRing value={progress} size={78} label="complete" />
            <div>
              <div className="text-2xl font-semibold">{progress}%</div>
              <div className="text-sm text-text-secondary mt-1">{done} completed</div>
            </div>
          </div>
        </Card>
        <Card title="Work distribution" subtitle="Where the remaining work currently sits.">
          <StackedDistribution data={statusData} />
        </Card>
      </div>

      <Card title="Milestones" subtitle="Important project dates." className="mb-6">
        {project.milestones?.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {project.milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-xl border border-border bg-page/40 p-3">
                <div className="text-sm font-medium">{milestone.title}</div>
                <div className="text-xs text-text-muted mt-1">
                  {milestone.dueDate ? milestone.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-muted">No milestones yet.</div>
        )}
      </Card>

      <section>
        <div className="mb-3">
          <h2 className="font-voice text-xl font-semibold">Project tasks</h2>
          <p className="text-xs text-text-muted mt-0.5">{tasks.length} tasks across the whole team.</p>
        </div>
        <ProjectTaskWorkspace
          tasks={serialized}
          people={people.map((person) => ({ id: person.id, name: person.name }))}
          myTaskIds={[...myTaskIds]}
        />
      </section>
    </AppShell>
  );
}
