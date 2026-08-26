import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { trackerItems, trackers } from "@/db/tracker-schema";

export type TrackerStage = { key: string; label: string };

export function parseTrackerStages(value: string): TrackerStage[] {
  try {
    const parsed = JSON.parse(value) as TrackerStage[];
    if (Array.isArray(parsed) && parsed.every((stage) => stage?.key && stage?.label)) return parsed;
  } catch {}
  return [
    { key: "new", label: "New" },
    { key: "in_progress", label: "In progress" },
    { key: "waiting", label: "Waiting" },
    { key: "done", label: "Done" },
  ];
}

export async function getTrackersWithCounts() {
  const [allTrackers, allItems] = await Promise.all([
    db.query.trackers.findMany({
      where: isNull(trackers.archivedAt),
      orderBy: [asc(trackers.name)],
    }),
    db.query.trackerItems.findMany({
      where: isNull(trackerItems.archivedAt),
    }),
  ]);

  return allTrackers.map((tracker) => {
    const items = allItems.filter((item) => item.trackerId === tracker.id);
    const needsAction = items.filter((item) => ["needs_reply", "follow_up", "no_next_step"].includes(item.actionState)).length;
    return {
      ...tracker,
      stagesParsed: parseTrackerStages(tracker.stages),
      itemCount: items.length,
      needsAction,
    };
  });
}

export async function getArchivedTrackers() {
  return db.query.trackers.findMany({
    where: isNotNull(trackers.archivedAt),
    orderBy: [asc(trackers.name)],
  });
}

export async function getTrackerWithItems(trackerId: string) {
  const tracker = await db.query.trackers.findFirst({
    where: and(eq(trackers.id, trackerId), isNull(trackers.archivedAt)),
  });
  if (!tracker) return null;

  const items = await db.query.trackerItems.findMany({
    where: and(eq(trackerItems.trackerId, trackerId), isNull(trackerItems.archivedAt)),
    with: { owner: true },
    orderBy: [asc(trackerItems.title)],
  });

  return {
    tracker: { ...tracker, stagesParsed: parseTrackerStages(tracker.stages) },
    items,
  };
}
