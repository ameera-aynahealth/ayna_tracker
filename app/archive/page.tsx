import Link from "next/link";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getArchiveView } from "@/lib/archive-queries";
import { AppShell } from "@/components/app-shell";
import { ProjectDeleteButton } from "@/components/project-delete-button";
import { TaskRow } from "@/components/task-row";
import { MetricCard } from "@/components/visuals";

export default async function ArchivePage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const archive = await getArchiveView();
  const completed = archive.tasks.filter((task) => task.status === "completed").length;
  const cancelled = archive.tasks.filter((task) => task.status === "cancelled").length;

  return (
    <AppShell active="Archive" currentUser={user}>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Past work</p>
        <h1 className="font-voice text-3xl font-semibold">Archive</h1>
        <p className="text-sm text-text-secondary mt-1">Deleted projects are recoverable here, so accidental cleanup never destroys Ayna work.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <MetricCard label="Completed tasks" value={completed} tone="sage" />
        <MetricCard label="Cancelled tasks" value={cancelled} tone="gold" />
        <MetricCard label="Archived projects" value={archive.projects.length} tone="accent" />
        <MetricCard label="Total archived" value={archive.tasks.length + archive.projects.length} tone="plum" />
      </div>

      {archive.projects.length > 0 && (
        <section className="mb-7">
          <h2 className="font-voice text-xl font-semibold mb-3">Projects</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {archive.projects.map((project) => (
              <div key={project.id} className="border border-border bg-surface rounded-2xl p-4">
                <Link href={`/projects/${project.id}`} className="block hover:text-accent-text">
                  <div className="font-medium text-sm">{project.name}</div>
                  <div className="text-xs text-text-muted mt-1 capitalize">{project.status.replaceAll("_", " ")} · {project.owner?.name ?? "No owner"}</div>
                </Link>
                {project.archivedAt && <div className="mt-3"><ProjectDeleteButton projectId={project.id} archived /></div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-voice text-xl font-semibold mb-3">Closed tasks</h2>
        <div className="border border-border bg-surface divide-y divide-border overflow-hidden" style={{ borderRadius: "20px 10px 10px 10px" }}>
          {archive.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
          {archive.tasks.length === 0 && <div className="p-10 text-center text-sm text-text-muted">Nothing has been archived yet.</div>}
        </div>
      </section>
    </AppShell>
  );
}
