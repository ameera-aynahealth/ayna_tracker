import { startOfTodayUTC } from "@/lib/date-utils";

export function formatDueBadge(dueAt: Date | null, status: string): { label: string; tone: string } {
  if (status === "waiting") return { label: "Waiting", tone: "plum" };
  if (status === "blocked") return { label: "Blocked", tone: "plum" };
  if (status === "needs_review") return { label: "Needs review", tone: "accent" };
  if (status === "completed") return { label: "Completed", tone: "sage" };
  if (!dueAt) return { label: "No due date", tone: "accent" };

  const today = startOfTodayUTC();
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfter = new Date(tomorrow.getTime() + 86400000);
  const weekOut = new Date(today.getTime() + 7 * 86400000);

  if (dueAt < today) {
    const days = Math.max(1, Math.round((today.getTime() - dueAt.getTime()) / 86400000));
    return { label: days === 1 ? "1 day overdue" : `${days} days overdue`, tone: "brick" };
  }
  if (dueAt < tomorrow) return { label: "Due today", tone: "gold" };
  if (dueAt < dayAfter) return { label: "Due tomorrow", tone: "accent" };
  if (dueAt < weekOut) {
    return { label: dueAt.toLocaleDateString("en-US", { weekday: "short" }), tone: "accent" };
  }
  return { label: dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }), tone: "accent" };
}
