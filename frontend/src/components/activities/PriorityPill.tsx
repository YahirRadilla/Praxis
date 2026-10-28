import { Flag } from "@phosphor-icons/react";
import StatusPill from "../StatusPill";
import { ACTIVITY_PRIORITY } from "../../utils/statusStyles";
import type { ActivityPriority } from "../../types/activity";

interface PriorityPillProps {
  priority: ActivityPriority;
  className?: string;
}

function PriorityPill({ priority, className }: PriorityPillProps) {
  const style = ACTIVITY_PRIORITY[priority] ?? ACTIVITY_PRIORITY.MEDIA;

  return (
    <span className="inline-flex items-center gap-1">
      <Flag size={12} weight="fill" color={style.fg} />
      <StatusPill status={style} className={className} />
    </span>
  );
}

export default PriorityPill;
