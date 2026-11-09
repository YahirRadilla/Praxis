import { memo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChatCircle, Paperclip } from "@phosphor-icons/react";
import type { Activity } from "../../types/activity";
import AvatarStack from "../AvatarStack";
import PriorityPill from "./PriorityPill";
import ActivityCardMenu from "./ActivityCardMenu";
import { ACTIVITY_STATUS, CARD_SHADOW } from "../../utils/statusStyles";
import { getChipTextColor } from "../../utils/chipTextColor";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

interface ActivityCardViewProps {
  activity: Activity;
  projectId: number;
  isProjectOwner: boolean;
  canEdit: boolean;
  onMoved?: () => void;
  highlighted?: boolean;
  className?: string;
}

/**
 * Pure visual body of a task card — no dnd-kit hooks. Used both by the real,
 * sortable `ActivityCard` below and by `ActivityBoard`'s `DragOverlay`, which
 * must render a copy of the card outside of any `SortableContext`.
 */
function ActivityCardViewImpl({
  activity,
  projectId,
  isProjectOwner,
  canEdit,
  onMoved,
  highlighted,
  className = "",
}: ActivityCardViewProps) {
  const isOverdue = activity.status !== "DONE" && new Date(activity.dueDate) < new Date();
  const checklistTotal = activity.checklistItems.length;
  const checklistDone = activity.checklistItems.filter((i) => i.done).length;

  return (
    <div
      className={`bg-paper-raised border border-rule rounded-xl p-3 flex flex-col gap-2 motion-reduce:transition-none transition-shadow duration-150 ${CARD_SHADOW} ${
        highlighted ? "ring-2 ring-accent-primary" : ""
      } ${className}`}
    >
      {activity.labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activity.labels.map((link) => (
            <span
              key={link.labelId}
              style={{ backgroundColor: link.label.colorHex, color: getChipTextColor(link.label.colorHex) }}
              className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            >
              {link.label.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-2 m-0">{activity.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`font-data text-[11.5px] ${isOverdue ? "" : "text-ink-soft"}`}
          style={isOverdue ? { color: ACTIVITY_STATUS.OVERDUE.fg } : undefined}
        >
          {formatDate(activity.dueDate)}
        </span>
        <PriorityPill priority={activity.priority} />
      </div>

      {checklistTotal > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-surface-ground overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
            />
          </div>
          <span className="font-data text-[11px] text-ink-faint">
            {checklistDone}/{checklistTotal}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <AvatarStack people={activity.assignees.map((a) => a.user)} size="sm" />
        <div className="flex items-center gap-2.5">
          {activity._count.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-ink-faint">
              <ChatCircle size={14} />
              {activity._count.comments}
            </span>
          )}
          {activity._count.attachments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-ink-faint">
              <Paperclip size={14} />
              {activity._count.attachments}
            </span>
          )}
          {canEdit && (
            <ActivityCardMenu
              projectId={projectId}
              activity={activity}
              isProjectOwner={isProjectOwner}
              onMoved={() => onMoved?.()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized: dnd-kit's SortableContext re-renders every card in a column on
 * each drag-over tick (to recalculate whether it should shift and make room
 * for the dragged one), not just the card being dragged. Without this, that
 * remounted the whole card body — labels, checklist bar, avatars, the
 * Headless UI menu — on every pointer-move frame, which is what caused the
 * drag to feel janky/flickery instead of smooth.
 */
export const ActivityCardView = memo(ActivityCardViewImpl);

interface ActivityCardProps {
  activity: Activity;
  projectId: number;
  isProjectOwner: boolean;
  canEdit: boolean;
  dragDisabled: boolean;
}

function ActivityCard({ activity, projectId, isProjectOwner, canEdit, dragDisabled }: ActivityCardProps) {
  const navigate = useNavigate();
  const [highlighted, setHighlighted] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Without this, touch devices hand the gesture to native scrolling
    // before PointerSensor's activation distance is reached, so dragging
    // never starts on mobile.
    touchAction: "none",
  };

  const handleMoved = useCallback(() => {
    setHighlighted(true);
    setTimeout(() => setHighlighted(false), 800);
  }, []);

  function handleClick() {
    navigate(`/proyectos/${projectId}/actividades/${activity.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
      onClick={handleClick}
      // Instant, not animated: a fading dim/undim competes visually with the
      // sibling cards reordering at the exact same instant (the optimistic
      // move lands in the same render as `isDragging` flipping), which reads
      // as flicker. An instant toggle avoids that race entirely.
      className={`cursor-pointer ${isDragging ? "opacity-40" : ""}`}
    >
      <ActivityCardView
        activity={activity}
        projectId={projectId}
        isProjectOwner={isProjectOwner}
        canEdit={canEdit}
        onMoved={handleMoved}
        highlighted={highlighted}
        className="hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_18px_40px_-16px_rgba(20,22,26,0.3)] hover:-translate-y-0.5 motion-reduce:transition-none transition-transform duration-150"
      />
    </div>
  );
}

export default ActivityCard;
