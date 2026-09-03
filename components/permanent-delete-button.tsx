"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import {
  permanentlyDeleteProject,
  permanentlyDeleteTask,
  permanentlyDeleteTracker,
} from "@/lib/actions/permanent-delete";

type DeleteKind = "task" | "project" | "tracker";

export function PermanentDeleteButton({
  kind,
  id,
  label,
}: {
  kind: DeleteKind;
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function permanentlyDelete() {
    if (kind === "task") await permanentlyDeleteTask(id);
    if (kind === "project") await permanentlyDeleteProject(id);
    if (kind === "tracker") await permanentlyDeleteTracker(id);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brick-text hover:bg-brick-soft"
      >
        <Trash2 size={13} /> {label ?? "Delete forever"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-brick/25 bg-brick-soft p-3 max-w-sm">
      <div className="flex items-start gap-2">
        <TriangleAlert size={15} className="text-brick-text mt-0.5 shrink-0" />
        <div>
          <div className="text-xs font-semibold text-brick-text">Are you sure?</div>
          <p className="text-xs text-brick-text/80 mt-1 leading-5">
            This will permanently delete this {kind}. This cannot be undone or restored from Archive.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            await permanentlyDelete();
            setConfirming(false);
            router.refresh();
          })}
          className="rounded-lg bg-brick text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
        >
          {isPending ? "Deleting" : "Yes, delete forever"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
