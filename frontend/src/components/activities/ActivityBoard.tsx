import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
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

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

  function resolveTarget(overId: string, excludeId: number): { status: ActivityStatus; index: number } | null {
    if (overId.startsWith("column-")) {
      const status = overId.replace("column-", "") as ActivityStatus;
      const column = (columns.get(status) ?? []).filter((a) => a.id !== excludeId);
      return { status, index: column.length };
    }
    const overActivity = activities.find((a) => a.id === Number(overId));
    if (!overActivity) return null;
    const column = (columns.get(overActivity.status) ?? []).filter((a) => a.id !== excludeId);
    const index = column.findIndex((a) => a.id === overActivity.id);
    return { status: overActivity.status, index: index === -1 ? column.length : index };
  }

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
    if (target.status === moved.status && target.index === moved.position) return;

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

  const reducedMotion = prefersReducedMotion();

  const board = (
    <div className="flex gap-3 overflow-x-auto pb-2">
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{ announcements }}
        >
          {board}
          <DragOverlay dropAnimation={reducedMotion ? null : dropAnimation}>
            {activeActivity && (
              <ActivityCardView
                activity={activeActivity}
                projectId={projectId}
                isProjectOwner={isProjectOwner}
                canEdit={false}
                className="rotate-[1.5deg] scale-[1.02] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_18px_40px_-16px_rgba(20,22,26,0.3)] motion-reduce:transform-none"
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

export default ActivityBoard;
