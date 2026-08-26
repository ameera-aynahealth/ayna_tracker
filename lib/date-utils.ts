export function startOfTodayUTC(tz: string = "America/New_York") {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  local.setHours(0, 0, 0, 0);
  const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: tz })).getTime();
  return new Date(local.getTime() + offsetMs);
}

const OPEN_STATUSES = ["backlog", "not_started", "in_progress", "waiting", "blocked", "needs_review"] as const;

export function isOpenStatus(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

export const OPEN_STATUS_LIST = OPEN_STATUSES;
