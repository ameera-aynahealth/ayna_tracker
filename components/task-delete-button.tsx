"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { deleteTaskSafely, restoreTask } from "@/lib/actions/task-archive";

export function TaskDeleteButton({ taskId, archived = false }: { taskId: string; archived?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (archived) {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await restoreTask(taskId);
          router.push(`/tasks/${taskId}`);
          router.refresh();
        })}
        className="inline-flex items-center gap-1.5 border border-border bg-surface rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary"
      >
        <ArchiveRestore size={13} /> Restore
      </button>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this task? It will move to Archive so you can restore it.")) return;
        startTransition(async () => {
          await deleteTaskSafely(taskId);
          router.push("/tasks");
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-brick-text"
    >
      <Trash2 size={13} /> Delete task
    </button>
  );
}
