"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTaskQuick } from "@/lib/actions/tasks";

export function QuickAddTask({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError("Enter a task title first");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createTaskQuick({ title: title.trim(), projectId, priority: "medium" });
      setTitle("");
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-accent text-[#FBF3EC] rounded-lg px-3.5 py-2 text-sm font-semibold"
      >
        <Plus size={15} />
        New task
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Task title, then press Enter"
          className="border border-border rounded-lg px-3 py-2 text-sm w-80 bg-surface"
          disabled={isPending}
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="text-sm font-medium text-accent-text"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-text-muted">
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-brick-text">{error}</span>}
    </div>
  );
}
