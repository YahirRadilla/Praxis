import type { StatusStyle } from "../utils/statusStyles";

function StatusPill({ status, className = "" }: { status: StatusStyle; className?: string }) {
  return (
    <span
      style={{ backgroundColor: status.bg, color: status.fg }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
    >
      <span style={{ backgroundColor: status.fg }} className="w-1.5 h-1.5 rounded-full shrink-0" />
      {status.label}
    </span>
  );
}

export default StatusPill;
