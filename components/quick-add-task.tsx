"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTaskQuick } from "@/lib/actions/tasks";

export function QuickAddTask({
  projectId,
  ownerId,
  workstreamId,
  status = "not_started",
  label = "New task",
}: {
  projectId?: string;
  ownerId?: string;
  workstreamId?: string;
  status?: "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const clean = title.trim();
    if (!clean) {
      setError("Enter a task title first");
      return;
    }

    setError(null);
    setTitle("");
    startTransition(async () => {
      try {
        await createTaskQuick({
          title: clean,
          projectId,
          ownerId,
          workstreamId,
          status,
          priority: "medium",
        });
      } catch (cause) {
        setTitle(clean);
        setError(cause instanceof Error ? cause.message : "Could not create the task");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-accent text-white rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-accent-text transition-colors"
      >
        <Plus size={15} />
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-full">
      <div className="flex items-center gap-2 max-w-full">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Type a title and press Enter"
          className="border border-border rounded-xl px-3 py-2 text-sm w-56 sm:w-80 max-w-full bg-surface outline-none focus:border-accent"
        />
        <button onClick={submit} className="text-sm font-semibold text-accent-text shrink-0">Add</button>
        <button onClick={() => setOpen(false)} className="text-sm text-text-muted shrink-0">Cancel</button>
      </div>
      <div className="min-h-4 flex items-center gap-2">
        {isPending && <span className="text-[11px] text-text-muted">Saving</span>}
        {error && <span className="text-xs text-brick-text">{error}</span>}
      </div>
    </div>
  );
}
