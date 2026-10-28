import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useMyActivities } from "../hooks/useActivities";
import { formatDate } from "../components/activities/ActivityCard";
import PriorityPill from "../components/activities/PriorityPill";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";
import { ACTIVITY_STATUS, CARD_SHADOW } from "../utils/statusStyles";
import type { ActivityStatus, MyActivity } from "../types/activity";

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-rule last:border-b-0">
      <Skeleton height={13} width="45%" shape="text" />
      <div className="flex-1" />
      <Skeleton height={11} width={48} shape="text" />
      <Skeleton height={18} width={56} shape="circle" />
      <Skeleton height={18} width={72} shape="circle" />
    </div>
  );
}

const STATUS_FILTERS: { label: string; value: ActivityStatus | undefined }[] = [
  { label: "Todas", value: undefined },
  { label: "Pendiente", value: "PENDING" },
  { label: "En progreso", value: "IN_PROGRESS" },
  { label: "Por validar", value: "TO_VALIDATE" },
  { label: "Completada", value: "DONE" },
];

function groupByProject(activities: MyActivity[]) {
  const groups = new Map<number, { name: string; items: MyActivity[] }>();
  for (const activity of activities) {
    const group = groups.get(activity.project.id);
    if (group) {
      group.items.push(activity);
    } else {
      groups.set(activity.project.id, { name: activity.project.name, items: [activity] });
    }
  }
  return [...groups.entries()].map(([projectId, group]) => ({ projectId, ...group }));
}

function MisTareas() {
  const [status, setStatus] = useState<ActivityStatus | undefined>(undefined);
  const { data: activities, isLoading } = useMyActivities({ status });
  const groups = useMemo(() => groupByProject(activities ?? []), [activities]);

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <header className="bg-paper-raised border-b border-rule px-8 py-7 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[26px] font-bold text-ink m-0">Mis tareas</h1>
          <p className="text-[13px] text-ink-soft m-0">
            Actividades asignadas a ti en todos los proyectos en los que participas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full text-[12.5px] font-semibold py-1.5 px-3.5 cursor-pointer ${
                status === filter.value
                  ? "bg-accent-primary text-paper"
                  : "border border-rule text-ink-soft hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-8 py-7 max-w-[900px] mx-auto w-full flex flex-col gap-5">
        {isLoading && (
          <section className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}>
            <div className="px-4 py-3 border-b border-rule">
              <Skeleton height={14} width={160} shape="text" />
            </div>
            <div className="flex flex-col">
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
            </div>
          </section>
        )}

        {!isLoading && groups.length === 0 && (
          <p className="text-[13px] text-ink-soft">
            {status
              ? "No tienes tareas asignadas con este filtro."
              : "Todavía no tienes tareas asignadas en ningún proyecto."}
          </p>
        )}

        {groups.map((group) => (
          <section
            key={group.projectId}
            className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}
          >
            <Link
              to={`/proyectos/${group.projectId}`}
              className="block px-4 py-3 border-b border-rule text-[13.5px] font-semibold text-ink hover:text-accent-primary"
            >
              {group.name}
            </Link>
            <div className="flex flex-col">
              {group.items.map((activity) => {
                const isOverdue = activity.status !== "DONE" && new Date(activity.dueDate) < new Date();
                return (
                  <Link
                    key={activity.id}
                    to={`/proyectos/${activity.projectId}/actividades/${activity.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-rule last:border-b-0 hover:bg-surface-ground"
                  >
                    <p className="flex-1 min-w-0 text-[13px] text-ink m-0 truncate">{activity.title}</p>
                    {activity.labels.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5 flex-wrap shrink-0">
                        {activity.labels.map((link) => (
                          <span
                            key={link.labelId}
                            style={{
                              backgroundColor: `${link.label.colorHex}22`,
                              color: link.label.colorHex,
                            }}
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap"
                          >
                            {link.label.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <span
                      className="font-data text-[11.5px] text-ink-soft shrink-0"
                      style={isOverdue ? { color: ACTIVITY_STATUS.OVERDUE.fg } : undefined}
                    >
                      {formatDate(activity.dueDate)}
                    </span>
                    <PriorityPill priority={activity.priority} className="shrink-0" />
                    <StatusPill
                      status={ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.PENDING}
                      className="shrink-0"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default MisTareas;
