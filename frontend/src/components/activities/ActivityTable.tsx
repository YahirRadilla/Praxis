import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type { Activity, ActivityPriority, ActivityStatus } from "../../types/activity";
import AvatarStack from "../AvatarStack";
import StatusPill from "../StatusPill";
import PriorityPill from "./PriorityPill";
import ActivityCardMenu from "./ActivityCardMenu";
import { formatDate } from "./ActivityCard";
import { ACTIVITY_STATUS } from "../../utils/statusStyles";

const STATUS_ORDER: ActivityStatus[] = ["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"];
const PRIORITY_ORDER: ActivityPriority[] = ["BAJA", "MEDIA", "ALTA"];

type SortKey = "title" | "status" | "priority" | "dueDate";
type SortDir = "asc" | "desc";

interface ActivityTableProps {
  projectId: number;
  activities: Activity[];
  isProjectOwner: boolean;
  readOnly: boolean;
}

function ActivityTable({ projectId, activities, isProjectOwner, readOnly }: ActivityTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
  }

  const sorted = useMemo(() => {
    if (!sortKey) return activities;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...activities].sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title, "es") * sign;
        case "status":
          return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * sign;
        case "priority":
          return (PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)) * sign;
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * sign;
        default:
          return 0;
      }
    });
  }, [activities, sortKey, sortDir]);

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => handleSort(k)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase text-ink-faint hover:text-ink-soft cursor-pointer"
      >
        {label}
        {active &&
          (sortDir === "asc" ? <CaretUp size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />)}
      </button>
    );
  }

  if (activities.length === 0) {
    return <p className="text-[13px] text-ink-soft py-4">No hay actividades para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-rule">
            <th className="text-left py-2.5 px-3">
              <SortHeader label="Título" k="title" />
            </th>
            <th className="text-left py-2.5 px-3">
              <SortHeader label="Estado" k="status" />
            </th>
            <th className="text-left py-2.5 px-3">
              <SortHeader label="Prioridad" k="priority" />
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase text-ink-faint">
              Responsables
            </th>
            <th className="text-left py-2.5 px-3">
              <SortHeader label="Fecha" k="dueDate" />
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase text-ink-faint">
              Etiquetas
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase text-ink-faint">
              Checklist
            </th>
            {!readOnly && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((activity) => {
            const isOverdue = activity.status !== "DONE" && new Date(activity.dueDate) < new Date();
            const checklistTotal = activity.checklistItems.length;
            const checklistDone = activity.checklistItems.filter((i) => i.done).length;

            return (
              <tr
                key={activity.id}
                onClick={() => navigate(`/proyectos/${projectId}/actividades/${activity.id}`)}
                className="border-b border-rule last:border-b-0 hover:bg-surface-ground cursor-pointer"
              >
                <td className="py-2.5 px-3 text-[13px] font-semibold text-ink max-w-[260px] truncate">
                  {activity.title}
                </td>
                <td className="py-2.5 px-3">
                  <StatusPill status={ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.PENDING} />
                </td>
                <td className="py-2.5 px-3">
                  <PriorityPill priority={activity.priority} />
                </td>
                <td className="py-2.5 px-3">
                  <AvatarStack people={activity.assignees.map((a) => a.user)} size="sm" />
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className="font-data text-[11.5px] text-ink-soft"
                    style={isOverdue ? { color: ACTIVITY_STATUS.OVERDUE.fg } : undefined}
                  >
                    {formatDate(activity.dueDate)}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5 flex-wrap max-w-[180px]">
                    {activity.labels.map((link) => (
                      <span
                        key={link.labelId}
                        style={{ backgroundColor: `${link.label.colorHex}22`, color: link.label.colorHex }}
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap"
                      >
                        {link.label.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  {checklistTotal > 0 && (
                    <span className="font-data text-[11.5px] text-ink-faint">
                      {checklistDone}/{checklistTotal}
                    </span>
                  )}
                </td>
                {!readOnly && (
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <ActivityCardMenu
                      projectId={projectId}
                      activity={activity}
                      isProjectOwner={isProjectOwner}
                      onMoved={() => {}}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ActivityTable;
