"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { archiveProject, restoreProject } from "@/lib/actions/projects";

export function ProjectDeleteButton({ projectId, archived }: { projectId: string; archived: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (archived) {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await restoreProject(projectId);
          router.push(`/projects/${projectId}`);
          router.refresh();
        })}
        className="inline-flex items-center gap-1.5 border border-border bg-surface rounded-xl px-3 py-2 text-sm font-semibold text-text-secondary hover:border-border-strong"
      >
        <ArchiveRestore size={14} /> Restore project
      </button>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 border border-border bg-surface rounded-xl px-3 py-2 text-sm font-semibold text-text-muted hover:text-brick-text hover:border-brick/30"
      >
        <Trash2 size={14} /> Delete project
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brick/20 bg-brick-soft px-3 py-2">
      <span className="text-xs text-brick-text">Move this project to Archive? Its tasks and history stay safe.</span>
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await archiveProject(projectId);
          router.push("/projects");
          router.refresh();
        })}
        className="text-xs font-semibold text-brick-text underline"
      >
        {isPending ? "Moving" : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs font-semibold text-text-secondary">Cancel</button>
    </div>
  );
}
