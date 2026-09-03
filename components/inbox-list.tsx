"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCheck, Circle } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

export type InboxItem = {
  id: string;
  taskId: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export function InboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.read).length;

  function markOne(id: string) {
    setItems((rows) => rows.map((row) => row.id === id ? { ...row, read: true } : row));
    startTransition(async () => { await markNotificationRead(id); });
  }

  function markAll() {
    setItems((rows) => rows.map((row) => ({ ...row, read: true })));
    startTransition(async () => { await markAllNotificationsRead(); });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-text-secondary">{unread} unread · {items.length} recent notifications</p>
        {unread > 0 && <button onClick={markAll} disabled={isPending} className="flex items-center gap-1.5 text-xs font-semibold text-accent-text"><CheckCheck size={14} />Mark all read</button>}
      </div>
      <div className="border border-border bg-surface overflow-hidden divide-y divide-border" style={{ borderRadius: "20px 10px 10px 10px" }}>
        {items.map((item) => {
          const inner = (
            <div className={`flex items-start gap-3 px-4 sm:px-5 py-4 hover:bg-page/55 ${item.read ? "opacity-70" : ""}`}>
              <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${item.read ? "bg-border-strong" : notificationTone(item.type)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-5">{item.title}</div>
                {item.body && <p className="text-xs text-text-secondary mt-1 leading-5">{item.body}</p>}
                <div className="text-[11px] text-text-muted mt-2">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              {!item.read && <button onClick={(event) => { event.preventDefault(); event.stopPropagation(); markOne(item.id); }} className="p-1.5 rounded-lg hover:bg-surface-sunk shrink-0" aria-label="Mark notification read"><Circle size={14} /></button>}
            </div>
          );
          return item.taskId ? <Link key={item.id} href={`/tasks/${item.taskId}`} onClick={() => !item.read && markOne(item.id)}>{inner}</Link> : <div key={item.id}>{inner}</div>;
        })}
        {items.length === 0 && <div className="p-12 text-center"><div className="font-voice text-xl font-semibold">Your inbox is clear</div><p className="text-sm text-text-muted mt-1">Assignments, mentions, reviews, and reminder notices will appear here.</p></div>}
      </div>
    </div>
  );
}

function notificationTone(type: string) {
  if (type === "overdue" || type === "blocked") return "bg-brick";
  if (type === "due_soon" || type === "review_requested") return "bg-gold";
  if (type === "mentioned" || type === "comment") return "bg-plum";
  return "bg-accent";
}
