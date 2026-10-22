import { useState } from "react";
import type { Activity, ActivityStatus, ProgressUpdate } from "../types/activity";
import type { SettableActivityStatus } from "../hooks/useActivities";
import StatusPill from "./StatusPill";
import { EvidenceItem } from "./ProgressUpdateCard";
import { ACTIVITY_STATUS, CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import { avatarColorFor } from "../utils/avatarColor";
import { timeAgo } from "../utils/text";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

const NEXT_STATUS: Partial<Record<ActivityStatus, { next: SettableActivityStatus; label: string }>> = {
  PENDING: { next: "IN_PROGRESS", label: "Marcar en progreso" },
  IN_PROGRESS: { next: "DONE", label: "Marcar como completada" },
};

interface ActivityRowProps {
  activity: Activity;
  canAct: boolean;
  isPending?: boolean;
  onAdvanceStatus?: (newStatus: SettableActivityStatus) => void;
  progressUpdates?: ProgressUpdate[];
}

function ActivityRow({ activity, canAct, isPending, onAdvanceStatus, progressUpdates = [] }: ActivityRowProps) {
  const [showProgress, setShowProgress] = useState(false);
  const advance = NEXT_STATUS[activity.status];

  return (
    <div className="border-b border-rule">
      <div className="flex items-center gap-3 py-[18px] px-[13px]">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-3">
          <span className="text-[13.5px] font-semibold text-ink truncate">{activity.title}</span>
          <span className="text-[11.5px] text-ink-faint truncate">
            {activity.description ?? "Sin descripción"}
          </span>
          {activity.assignee && (
            <span className="text-[11px] text-ink-faint truncate">
              Responsable: <span className="font-semibold text-ink-soft">{activity.assignee.name}</span>
            </span>
          )}
        </div>
        <div className="w-[180px] flex items-center gap-2 shrink-0">
          <span
            style={{ borderColor: "#26BDE2" }}
            className="w-[26px] h-[26px] rounded-full bg-surface-accent border-[1.5px] flex items-center justify-center text-[10px] font-bold text-ink shrink-0"
          >
            {activity.owner.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[12.5px] text-ink-soft truncate">{activity.owner.name}</span>
        </div>
        <span className="w-[110px] font-data text-[12px] text-ink-soft shrink-0">
          {formatDate(activity.dueDate)}
        </span>
        <StatusPill
          status={ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.PENDING}
          className="w-[100px] justify-center shrink-0"
        />
        <div className="w-[150px] flex items-center justify-end gap-2 shrink-0">
          {canAct && advance && (
            <button
              type="button"
              onClick={() => onAdvanceStatus?.(advance.next)}
              disabled={isPending}
              className={`rounded-full text-[11.5px] font-bold py-1.5 px-3 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
            >
              {advance.label}
            </button>
          )}
        </div>
      </div>

      <div className="px-[13px] pb-3">
        <button
          type="button"
          onClick={() => setShowProgress((v) => !v)}
          className="text-[11.5px] font-semibold text-accent-primary cursor-pointer"
        >
          {showProgress ? "Ocultar avances" : "Ver avances"}
        </button>

        {showProgress && (
          <div className={`mt-2 flex flex-col gap-2 bg-surface-ground border border-rule rounded-lg p-3 ${CARD_SHADOW}`}>
            {progressUpdates.length === 0 && (
              <p className="text-[12px] text-ink-faint m-0">Sin avances registrados todavía.</p>
            )}
            {progressUpdates.map((update) => (
              <div key={update.id} className="flex gap-2">
                <span
                  style={{ backgroundColor: avatarColorFor(update.author.id) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9.5px] font-bold shrink-0 mt-0.5"
                >
                  {update.author.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink-soft leading-snug m-0">
                    <span className="font-semibold text-ink">{update.author.name}</span> {update.text}
                    <span className="block text-[11px] text-ink-faint mt-0.5">{timeAgo(update.createdAt)}</span>
                  </p>
                  {update.evidence.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      {update.evidence.map((ev) => (
                        <EvidenceItem key={ev.id} ev={ev} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityRow;
