import { useEffect, useRef, useState } from "react";
import { CaretDown, Users } from "@phosphor-icons/react";
import type { TeamMember } from "../../types/team";
import { CARD_SHADOW } from "../../utils/statusStyles";
import { avatarColorFor } from "../../utils/avatarColor";
import { pluralize } from "../../utils/text";

interface AssigneeSelectProps {
  team: TeamMember[];
  value: number[];
  onChange: (ids: number[]) => void;
}

function AssigneeSelect({ team, value, onChange }: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  const label =
    value.length === 0
      ? "Sin responsables"
      : `${value.length} ${pluralize(value.length, "responsable", "responsables")}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] cursor-pointer ${
          value.length > 0
            ? "border-accent-primary text-accent-primary bg-surface-ground"
            : "border-rule text-ink-soft bg-paper"
        }`}
      >
        <Users size={14} />
        {label}
        <CaretDown
          size={12}
          className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] w-[240px] max-h-[280px] overflow-y-auto bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
        >
          {team.length === 0 && (
            <p className="text-[12px] text-ink-faint px-3.5 py-2 m-0">Sin integrantes en el equipo.</p>
          )}
          {team.map((member) => (
            <label
              key={member.id}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-ink hover:bg-surface-ground cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(member.id)}
                onChange={() => toggle(member.id)}
                className="accent-accent-primary w-[14px] h-[14px] cursor-pointer"
              />
              <span
                style={{ backgroundColor: avatarColorFor(member.id) }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              >
                {member.name.charAt(0).toUpperCase()}
              </span>
              {member.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssigneeSelect;
