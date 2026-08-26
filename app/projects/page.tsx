import { getOrCreateCurrentUser } from "@/lib/auth";
import { getProjectsWithProgress } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { NewProjectButton } from "@/components/new-project-button";
import Link from "next/link";

const healthClasses: Record<string, string> = {
  on_track: "bg-sage-soft text-sage-text",
  needs_attention: "bg-gold-soft text-gold-text",
  at_risk: "bg-brick-soft text-brick-text",
  blocked: "bg-plum-soft text-plum-text",
};

function healthLabel(h: string) {
  return h.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default async function ProjectsPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const projects = await getProjectsWithProgress();

  return (
    <AppShell active="Projects" currentUserName={user.name}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-voice text-2xl font-semibold mb-1">Projects</h1>
          <p className="text-sm text-text-secondary">{projects.length} active projects</p>
        </div>
        <NewProjectButton />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="border border-border bg-surface p-5 block hover:border-border-strong transition-colors"
            style={{ borderRadius: "20px 10px 10px 10px" }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-voice text-base font-semibold">{p.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthClasses[p.health]}`}>
                {healthLabel(p.health)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-sunk overflow-hidden mb-2">
              <div className="h-full bg-accent rounded-full" style={{ width: `${p.progressPct}%` }} />
            </div>
            <p className="text-xs text-text-muted">
              {p.tasksDone}/{p.taskCount} tasks &middot; {p.progressPct}% complete
              {p.overdueCount > 0 && <> &middot; {p.overdueCount} overdue</>}
              {p.blockedCount > 0 && <> &middot; {p.blockedCount} blocked</>}
            </p>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-2 border border-border rounded-xl bg-surface p-8 text-center text-sm text-text-secondary">
            No projects yet. Create your first project.
          </div>
        )}
      </div>
    </AppShell>
  );
}
