import Link from "next/link";
import { CalendarDays, CircleAlert, UserRound } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getProjectsWithProgress } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { NewProjectButton } from "@/components/new-project-button";
import { MetricCard, ProgressRing, humanize } from "@/components/visuals";

const healthClasses: Record<string, string> = {
  on_track: "bg-sage-soft text-sage-text",
  needs_attention: "bg-gold-soft text-gold-text",
  at_risk: "bg-brick-soft text-brick-text",
  blocked: "bg-plum-soft text-plum-text",
};

export default async function ProjectsPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const projects = await getProjectsWithProgress();

  const atRisk = projects.filter((project) => project.health === "at_risk" || project.health === "blocked" || project.health === "needs_attention").length;
  const overdue = projects.reduce((sum, project) => sum + project.overdueCount, 0);
  const totalTasks = projects.reduce((sum, project) => sum + project.taskCount, 0);
  const doneTasks = projects.reduce((sum, project) => sum + project.tasksDone, 0);

  return (
    <AppShell active="Projects" currentUser={user}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Workspace planning</p>
          <h1 className="font-voice text-3xl font-semibold">Projects</h1>
          <p className="text-sm text-text-secondary mt-1">See progress, deadlines, owners, and risk without opening every project.</p>
        </div>
        <NewProjectButton />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-7">
        <MetricCard label="Active projects" value={projects.length} tone="accent" />
        <MetricCard label="Need attention" value={atRisk} tone="gold" />
        <MetricCard label="Overdue tasks" value={overdue} tone="brick" />
        <MetricCard label="Overall progress" value={totalTasks ? `${Math.round((doneTasks / totalTasks) * 100)}%` : "0%"} tone="sage" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group border border-border bg-surface p-5 sm:p-6 hover:border-border-strong hover:-translate-y-0.5 transition-all"
            style={{ borderRadius: "24px 12px 12px 12px" }}
          >
            <div className="flex items-start gap-4 mb-5">
              <ProgressRing value={project.progressPct} size={82} />
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-start gap-2 justify-between">
                  <h2 className="font-voice text-lg font-semibold leading-5 group-hover:text-accent-text break-words">{project.name}</h2>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${healthClasses[project.health]}`}>{humanize(project.health)}</span>
                </div>
                {project.workstream && <div className="text-xs text-text-muted mt-1">{project.workstream.name}</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="rounded-xl bg-page p-2.5 text-center"><div className="font-voice text-lg font-semibold">{project.taskCount}</div><div className="text-[10px] text-text-muted">Tasks</div></div>
              <div className="rounded-xl bg-brick-soft p-2.5 text-center"><div className="font-voice text-lg font-semibold text-brick-text">{project.overdueCount}</div><div className="text-[10px] text-brick-text">Overdue</div></div>
              <div className="rounded-xl bg-plum-soft p-2.5 text-center"><div className="font-voice text-lg font-semibold text-plum-text">{project.blockedCount}</div><div className="text-[10px] text-plum-text">Blocked</div></div>
            </div>

            <div className="space-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2"><UserRound size={13} className="text-text-muted" /><span className="truncate">{project.owner?.name ?? "No owner"}</span></div>
              <div className="flex items-center gap-2"><CircleAlert size={13} className="text-text-muted" /><span>{project.tasksDone} of {project.taskCount} complete</span></div>
              <div className="flex items-center gap-2"><CalendarDays size={13} className="text-text-muted" /><span>{project.dueDate ? `Due ${project.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No project deadline"}</span></div>
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 border border-border bg-surface p-12 text-center" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <div className="font-voice text-xl font-semibold">No active projects yet</div>
            <p className="text-sm text-text-muted mt-1">Create your first project to start organizing Ayna work.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
