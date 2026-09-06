"use client";

import { useState, useTransition } from "react";
import { Plus, UserRound, X } from "lucide-react";
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
  const defaultAssignees = ownerId ? [ownerId] : currentUserId ? [currentUserId] : [];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(defaultAssignees);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function toggleAssignee(personId: string) {
    setSelectedAssigneeIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
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
          assigneeIds: selectedAssigneeIds,
          workstreamId,
          status,
          priority: "medium",
        });
        setTitle("");
        setSelectedAssigneeIds(defaultAssignees);
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
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(380px,calc(100vw-24px))] rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="font-voice text-lg font-semibold">New task</div>
              <div className="text-xs text-text-muted mt-0.5">Add it now and assign one or more teammates.</div>
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

          <div className="mt-3">
            <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-text-muted">Assign to</span>
            <div className="mt-1.5 border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 text-xs text-text-muted flex items-center gap-2 border-b border-border bg-page">
                <UserRound size={13} />
                {selectedAssigneeIds.length === 0 ? "Unassigned" : `${selectedAssigneeIds.length} selected`}
              </div>
              <div className="max-h-40 overflow-y-auto p-1.5">
                {people.map((person) => {
                  const checked = selectedAssigneeIds.includes(person.id);
                  return (
                    <label key={person.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-page cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignee(person.id)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <span>{person.id === currentUserId ? `${person.name} (me)` : person.name}</span>
                    </label>
                  );
                })}
                {people.length === 0 && <div className="px-2.5 py-2 text-xs text-text-muted">No active teammates yet.</div>}
              </div>
            </div>
          </div>

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
