import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "@phosphor-icons/react";
import type { Activity, ActivityStatus } from "../../types/activity";
import StatusPill from "../StatusPill";
import ActivityCard from "./ActivityCard";
import { ACTIVITY_STATUS } from "../../utils/statusStyles";

interface BoardColumnProps {
  status: ActivityStatus;
  activities: Activity[];
  projectId: number;
  isProjectOwner: boolean;
  canEdit: boolean;
  dragDisabled: boolean;
  onAddClick: () => void;
}

function BoardColumn({
  status,
  activities,
  projectId,
  isProjectOwner,
  canEdit,
  dragDisabled,
  onAddClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, disabled: dragDisabled });
  const style = ACTIVITY_STATUS[status];

  return (
    <div
      ref={setNodeRef}
      className={`bg-surface-ground rounded-2xl p-2.5 flex flex-col gap-2 min-w-[272px] transition-colors motion-reduce:transition-none ${
        isOver ? "ring-2 ring-accent-primary/30 bg-surface-accent/30" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <StatusPill status={style} />
          <span className="font-data text-[12px] text-ink-faint">{activities.length}</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onAddClick}
            aria-label={`Agregar actividad en ${style.label}`}
            className="w-6 h-6 flex items-center justify-center rounded-full text-ink-faint hover:bg-paper-raised hover:text-ink cursor-pointer"
          >
            <Plus size={16} weight="bold" />
          </button>
        )}
      </div>

      <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[40px]">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              projectId={projectId}
              isProjectOwner={isProjectOwner}
              canEdit={canEdit}
              dragDisabled={dragDisabled}
            />
          ))}
          {activities.length === 0 && (
            <p className="text-[12px] text-ink-faint text-center py-4 m-0">Sin tareas.</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default BoardColumn;
