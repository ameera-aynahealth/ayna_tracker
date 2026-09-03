"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

type NotificationItem = {
  id: string;
  taskId: string | null;
  title: string;
  body: string | null;
  createdAt: Date;
};

export function NotificationBell({ items, count }: { items: NotificationItem[]; count: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative p-2 rounded-xl border border-transparent hover:border-border hover:bg-surface"
        aria-label={`${count} unread notifications`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brick text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-32px))] bg-surface border border-border shadow-xl z-40 overflow-hidden" style={{ borderRadius: "20px 10px 10px 10px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="font-voice font-semibold">Inbox</div>
              <div className="text-xs text-text-muted">{count} unread</div>
            </div>
            {count > 0 && (
              <button disabled={isPending} onClick={markAll} className="text-xs font-semibold text-accent-text">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">Nothing new right now.</div>
            ) : (
              items.map((item) => {
                const content = (
                  <div className="px-4 py-3 hover:bg-surface-sunk/50 border-b border-border last:border-b-0">
                    <div className="text-sm font-medium leading-5">{item.title}</div>
                    {item.body && <div className="text-xs text-text-secondary mt-1 line-clamp-2">{item.body}</div>}
                    <div className="text-[11px] text-text-muted mt-1.5">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                );
                if (!item.taskId) return <div key={item.id}>{content}</div>;
                return (
                  <Link
                    key={item.id}
                    href={`/tasks/${item.taskId}`}
                    onClick={() => startTransition(async () => { await markNotificationRead(item.id); setOpen(false); })}
                  >
                    {content}
                  </Link>
                );
              })
            )}
          </div>
          <Link href="/inbox" onClick={() => setOpen(false)} className="block px-4 py-3 text-center text-xs font-semibold text-accent-text border-t border-border">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
