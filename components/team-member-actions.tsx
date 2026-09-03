"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTeamUser } from "@/lib/actions/team";

export function TeamMemberActions({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(`Delete ${userName} from the tracker? Their old comments and activity history will be preserved.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTeamUser(userId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete this user");
      }
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={remove}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brick-text disabled:opacity-50"
      >
        <Trash2 size={13} />
        {isPending ? "Deleting" : "Delete user"}
      </button>
      {error && <div className="text-[11px] text-brick-text mt-1.5">{error}</div>}
    </div>
  );
}
