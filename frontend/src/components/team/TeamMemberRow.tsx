import type { TeamMember } from "../../types/team";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Responsable",
  COLLABORATOR: "Colaborador",
  TEACHER: "Docente",
  ORGANIZATION: "Organización",
};

interface TeamMemberRowProps {
  member: TeamMember;
  /** Owner-only "Quitar" action (WU-09). Omitted entirely for the owner's
   * own row — the owner can't remove themself through this endpoint. */
  onRemove?: () => void;
}

function TeamMemberRow({ member, onRemove }: TeamMemberRowProps) {
  return (
    <div className="flex items-center gap-3 py-[18px] px-3 border-b border-rule">
      <span
        style={{ borderColor: "#26BDE2" }}
        className="w-9 h-9 rounded-full bg-surface-accent border-2 flex items-center justify-center text-[13px] font-bold text-ink shrink-0"
      >
        {member.name.charAt(0).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[13.5px] font-semibold text-ink truncate">{member.name}</span>
        {member.email && (
          <span className="text-[11.5px] text-ink-faint truncate">{member.email}</span>
        )}
      </div>
      <span
        style={{ color: "#3F7E44", backgroundColor: "#EAF4EA" }}
        className="rounded-full px-[11px] py-[5px] text-[11px] font-semibold shrink-0"
      >
        {ROLE_LABELS[member.role] ?? member.role}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[11.5px] font-semibold text-ink-faint hover:text-danger cursor-pointer shrink-0"
        >
          Quitar
        </button>
      )}
    </div>
  );
}

export default TeamMemberRow;
