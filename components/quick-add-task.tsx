"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Plus, UserRound, X } from "lucide-react";
import { createTaskQuick } from "@/lib/actions/tasks";

type PersonOption = { id: string; name: string };

export function QuickAddTask({
  projectId,
  ownerId,
  currentUserId,
  people = [],
  workstreamId,
  status = "not_started",
  label = "New task",
}: {
  projectId?: string;
  ownerId?: string;
  currentUserId?: string;
  people?: PersonOption[];
  workstreamId?: string;
  status?: "backlog" | "not_started" | "in_progress" | "waiting" | "blocked" | "needs_review";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(ownerId ?? currentUserId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function submit() {
    const clean = title.trim();
    if (!clean) {
      setError("Enter a task title first");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createTaskQuick({
          title: clean,
          projectId,
          ownerId: selectedOwnerId || undefined,
          workstreamId,
          status,
          priority: "medium",
        });
        setTitle("");
        setSelectedOwnerId(ownerId ?? currentUserId ?? "");
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create the task");
      }
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 bg-accent text-white rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-accent-text transition-colors"
      >
        <Plus size={15} />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="font-voice text-lg font-semibold">New task</div>
              <div className="text-xs text-text-muted mt-0.5">Add it now and choose who owns it.</div>
            </div>
            <button onClick={close} className="p-1.5 rounded-lg text-text-muted hover:bg-page" aria-label="Close new task"><X size={15} /></button>
          </div>

          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
              if (event.key === "Escape") close();
            }}
            placeholder="What needs to get done?"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface outline-none focus:border-accent"
          />

          <label className="mt-3 block">
            <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-text-muted">Assign to</span>
            <div className="mt-1.5 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5">
              <UserRound size={14} className="text-text-muted shrink-0" />
              <select
                value={selectedOwnerId}
                onChange={(event) => setSelectedOwnerId(event.target.value)}
                className="bg-transparent outline-none text-sm flex-1 min-w-0 appearance-none"
              >
                <option value="">Unassigned</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.id === currentUserId ? `${person.name} (me)` : person.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="text-text-muted shrink-0" />
            </div>
          </label>

          {people.length === 0 && (
            <p className="text-xs text-text-muted mt-2">Teammates will appear here after they have successfully signed into Ayna Tracker.</p>
          )}

          <div className="min-h-5 mt-2">
            {isPending && <span className="text-xs text-text-muted">Saving</span>}
            {error && <span className="text-xs text-brick-text">{error}</span>}
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <button onClick={close} className="px-3 py-2 text-sm font-semibold text-text-secondary">Cancel</button>
            <button onClick={submit} disabled={isPending} className="bg-accent text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
              Create task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
