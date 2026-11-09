import { useCallback, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Activity, ActivityStatus } from "../../types/activity";
import type { TeamMember } from "../../types/team";
import { useMoveActivity } from "../../hooks/useActivities";
import { getErrorMessage } from "../../services/api";
import { toast } from "sonner";
import BoardColumn from "./BoardColumn";
import CreateActivityForm from "./CreateActivityForm";
import { ActivityCardView } from "./ActivityCard";
import { ACTIVITY_STATUS } from "../../utils/statusStyles";

const COLUMN_ORDER: ActivityStatus[] = ["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"];

interface ActivityBoardProps {
  projectId: number;
  activities: Activity[];
  team: TeamMember[];
  isProjectOwner: boolean;
  readOnly: boolean;
}

function ActivityBoard({ projectId, activities, team, isProjectOwner, readOnly }: ActivityBoardProps) {
  const moveActivity = useMoveActivity(projectId);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [creatingStatus, setCreatingStatus] = useState<ActivityStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const byStatus = new Map<ActivityStatus, Activity[]>();
    for (const status of COLUMN_ORDER) byStatus.set(status, []);
    for (const activity of activities) {
      byStatus.get(activity.status)?.push(activity);
    }
    for (const list of byStatus.values()) list.sort((a, b) => a.position - b.position);
    return byStatus;
  }, [activities]);

  const activeActivity = activeId != null ? activities.find((a) => a.id === activeId) ?? null : null;

  /**
   * Resolves the hovered column/card into a target (status, index). `index`
   * matches the position `moved` would land on if dropped there right now —
   * i.e. `overActivity`'s own index in its (unfiltered) column, not an index
   * recomputed after excluding `moved` from that list. Filtering `moved` out
   * first used to shift every card after it one slot too early, landing the
   * move one position above where the drag preview showed it.
   */
  function resolveTarget(overId: string, excludeId: number): { status: ActivityStatus; index: number } | null {
    const moved = activities.find((a) => a.id === excludeId);
    if (!moved) return null;

    if (overId.startsWith("column-")) {
      const status = overId.replace("column-", "") as ActivityStatus;
      const column = columns.get(status) ?? [];
      // Dropping into empty space of `moved`'s own column: it's still
      // counted in `column`, so the slot after removing+reappending it is
      // one shorter than a plain `column.length`.
      const index = moved.status === status ? Math.max(column.length - 1, 0) : column.length;
      return { status, index };
    }

    const overActivity = activities.find((a) => a.id === Number(overId));
    if (!overActivity) return null;
    const column = columns.get(overActivity.status) ?? [];
    const index = column.findIndex((a) => a.id === overActivity.id);
    return { status: overActivity.status, index: index === -1 ? column.length : index };
  }

  /**
   * Custom collision strategy: resolves which COLUMN is hovered first, then
   * runs `closestCenter` only against that column's own cards.
   *
   * Every column is also a droppable (`column-<status>`) covering its whole
   * area, in the same collision pool as every card inside it. Plain
   * `closestCenter` (or `rectIntersection`) picks whichever droppable's
   * center is nearest — and because the board is a flex row with the default
   * `align-items: stretch`, a busy column is as tall as the tallest column,
   * so its own vertical center often falls *between* two cards. Right there,
   * `over` flips between the column and a card from one frame to the next;
   * sortable's "make room" transform is cleared whenever `over` isn't a card
   * in that column (`overIndex` has no match), so every card in the column
   * snaps back then shifts again — that's the flicker. Narrowing the pool to
   * one column's cards up front removes that race entirely.
   */
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const isColumn = (id: UniqueIdentifier) => String(id).startsWith("column-");
      const columnContainers = args.droppableContainers.filter((c) => isColumn(c.id));
      const columnHit =
        pointerWithin({ ...args, droppableContainers: columnContainers })[0] ??
        rectIntersection({ ...args, droppableContainers: columnContainers })[0];
      if (!columnHit) return [];

      const status = String(columnHit.id).replace("column-", "") as ActivityStatus;
      const cardIds = new Set((columns.get(status) ?? []).map((a) => a.id));
      const cardContainers = args.droppableContainers.filter((c) => cardIds.has(Number(c.id)));
      if (cardContainers.length === 0) return [columnHit];

      return closestCenter({ ...args, droppableContainers: cardContainers });
    },
    [columns],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const movedId = Number(event.active.id);
    setActiveId(null);
    if (!event.over) return;

    const moved = activities.find((a) => a.id === movedId);
    if (!moved) return;

    const target = resolveTarget(String(event.over.id), movedId);
    if (!target) return;
    const movedIndex = (columns.get(moved.status) ?? []).findIndex((a) => a.id === movedId);
    if (target.status === moved.status && target.index === movedIndex) return;

    moveActivity.move(movedId, target.status, target.index, {
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo mover la actividad.")),
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const activity = activities.find((a) => a.id === Number(active.id));
      return activity ? `Tarjeta ${activity.title} tomada.` : undefined;
    },
    onDragOver({ active, over }) {
      if (!over) return undefined;
      const activity = activities.find((a) => a.id === Number(active.id));
      if (!activity) return undefined;
      const target = resolveTarget(String(over.id), Number(active.id));
      if (!target) return undefined;
      const columnLabel = ACTIVITY_STATUS[target.status]?.label ?? target.status;
      return `Tarjeta ${activity.title} sobre ${columnLabel}, posición ${target.index + 1}.`;
    },
    onDragEnd({ active, over }) {
      const activity = activities.find((a) => a.id === Number(active.id));
      if (!activity) return undefined;
      if (!over) return `Movimiento de ${activity.title} cancelado.`;
      const target = resolveTarget(String(over.id), Number(active.id));
      if (!target) return undefined;
      const columnLabel = ACTIVITY_STATUS[target.status]?.label ?? target.status;
      return `Tarjeta ${activity.title} movida a ${columnLabel}, posición ${target.index + 1}.`;
    },
    onDragCancel({ active }) {
      const activity = activities.find((a) => a.id === Number(active.id));
      return `Movimiento de ${activity?.title ?? "la tarjeta"} cancelado.`;
    },
  };

  const board = (
    <div className="flex gap-3 overflow-x-auto scroll-thin pb-2">
      {COLUMN_ORDER.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          activities={columns.get(status) ?? []}
          projectId={projectId}
          isProjectOwner={isProjectOwner}
          canEdit={!readOnly}
          dragDisabled={readOnly}
          onAddClick={() => setCreatingStatus(status)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      {creatingStatus && !readOnly && (
        <CreateActivityForm
          projectId={projectId}
          team={team}
          initialStatus={creatingStatus}
          onDone={() => setCreatingStatus(null)}
        />
      )}

      {readOnly ? (
        board
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{ announcements }}
        >
          {board}
          {/* No drop-settle animation: the optimistic update in
              `moveActivity.move` already moves the real card to its final
              spot in the same tick the drop happens, so a separate ghost
              animating back into place would just race the already-updated
              real card — that's what looked like a flicker right at drop.
              The overlay card also intentionally looks almost identical to
              the resting card now (only a subtle shadow, no rotate/scale):
              swapping from a tilted/scaled "lifted" ghost to a flat resting
              card at the exact drop instant read as a pop/flicker on its
              own, independent of timing. */}
          <DragOverlay dropAnimation={null}>
            {activeActivity && (
              <ActivityCardView
                activity={activeActivity}
                projectId={projectId}
                isProjectOwner={isProjectOwner}
                canEdit={false}
                className="shadow-[0_1px_2px_rgba(20,22,26,0.04),0_10px_24px_-14px_rgba(20,22,26,0.25)]"
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

export default ActivityBoard;
