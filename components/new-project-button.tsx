"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/lib/actions/projects";
import { useRouter } from "next/navigation";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim()) {
      setError("Enter a project name first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const id = await createProject({ name: name.trim() });
      setName("");
      setOpen(false);
      router.push(`/projects/${id}`);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-accent-text">
        + New project
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Project name"
          className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface"
        />
        <button onClick={submit} disabled={isPending} className="text-sm font-medium text-accent-text">
          {isPending ? "Creating…" : "Create"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-text-muted">Cancel</button>
      </div>
      {error && <span className="text-xs text-brick-text">{error}</span>}
    </div>
  );
}
