import type { TeamRequest } from "../../types/team";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../../utils/statusStyles";

function TeamRequestRow({
  request,
  onAccept,
  onReject,
  projectName,
}: {
  request: TeamRequest;
  onAccept: () => void;
  onReject: () => void;
  projectName?: string;
}) {
  return (
    <div className={`flex gap-3 bg-paper border border-rule rounded-lg p-3.5 ${CARD_SHADOW}`}>
      <span
        style={{ borderColor: "#0A97D9" }}
        className="w-10 h-10 rounded-full bg-surface-accent border-2 flex items-center justify-center text-[14px] font-bold text-ink shrink-0"
      >
        {request.user.name.charAt(0).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-heading text-[14px] font-bold text-ink">{request.user.name}</span>
        {projectName && <span className="text-[11.5px] text-accent-primary font-semibold">{projectName}</span>}
        <span className="text-[11.5px] text-ink-faint">{request.user.email}</span>
        {request.message && (
          <p className="text-[12.5px] text-ink-soft leading-relaxed m-0">{request.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReject}
          className="bg-paper-raised border border-rule rounded-full px-3.5 py-2 text-[12px] font-semibold text-ink-soft hover:bg-surface-ground"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={onAccept}
          className={`rounded-full px-3.5 py-2 text-[12px] font-bold ${PRIMARY_BUTTON}`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

export default TeamRequestRow;
