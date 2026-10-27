import type { Activity, ActivityStatus } from "../../types/activity";

/**
 * Pure reducer for moving an activity to a (possibly different) column and
 * index. Given the full activities list, the moved activity's id, and the
 * target status/index, returns a new activities array with `status` and
 * `position` recomputed for every activity in the affected column(s).
 *
 * No I/O — shared by the optimistic cache update in `useMoveActivity` and by
 * `ActivityBoard`'s drag-end handler, so the reordering math lives in exactly
 * one place.
 */
export function computeMoveResult(
  activities: Activity[],
  movedId: number,
  targetStatus: ActivityStatus,
  targetIndex: number,
): Activity[] {
  const moved = activities.find((a) => a.id === movedId);
  if (!moved) return activities;

  const sourceStatus = moved.status;

  const targetColumn = activities
    .filter((a) => a.status === targetStatus && a.id !== movedId)
    .sort((a, b) => a.position - b.position);

  const clampedIndex = Math.min(Math.max(targetIndex, 0), targetColumn.length);
  targetColumn.splice(clampedIndex, 0, moved);

  const updates = new Map<number, { status: ActivityStatus; position: number }>();
  targetColumn.forEach((a, index) => {
    updates.set(a.id, { status: targetStatus, position: index });
  });

  if (sourceStatus !== targetStatus) {
    const sourceColumn = activities
      .filter((a) => a.status === sourceStatus && a.id !== movedId)
      .sort((a, b) => a.position - b.position);
    sourceColumn.forEach((a, index) => {
      updates.set(a.id, { status: sourceStatus, position: index });
    });
  }

  return activities.map((a) => {
    const update = updates.get(a.id);
    return update ? { ...a, status: update.status, position: update.position } : a;
  });
}
