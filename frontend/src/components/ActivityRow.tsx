import type { Activity } from "../types/activity";
import StatusPill from "./StatusPill";
import { ACTIVITY_STATUS } from "../utils/statusStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-center gap-3 py-[18px] px-[13px] border-b border-rule">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-3">
        <span className="text-[13.5px] font-semibold text-ink truncate">{activity.title}</span>
        <span className="text-[11.5px] text-ink-faint truncate">
          {activity.description ?? "Sin descripción"}
        </span>
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
    </div>
  );
}

export default ActivityRow;
