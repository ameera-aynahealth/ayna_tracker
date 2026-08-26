"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArchiveRestore } from "lucide-react";
import { restoreTracker } from "@/lib/actions/trackers";

export function TrackerRestoreButton({ trackerId }: { trackerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await restoreTracker(trackerId);
        router.push(`/trackers/${trackerId}`);
        router.refresh();
      })}
      className="inline-flex items-center gap-1.5 border border-border bg-surface rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary"
    >
      <ArchiveRestore size={13} /> Restore
    </button>
  );
}
