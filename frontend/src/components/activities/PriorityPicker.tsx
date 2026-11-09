import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { ActivityPriority } from "../../types/activity";
import { ACTIVITY_PRIORITY, CARD_SHADOW } from "../../utils/statusStyles";

interface PriorityPickerProps {
  value: ActivityPriority;
  onChange: (priority: ActivityPriority) => void;
  disabled?: boolean;
}

const PRIORITY_OPTIONS: ActivityPriority[] = ["BAJA", "MEDIA", "ALTA"];

function PriorityPicker({ value, onChange, disabled }: PriorityPickerProps) {
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

  const current = ACTIVITY_PRIORITY[value];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Prioridad"
        style={{ backgroundColor: current?.bg, color: current?.fg }}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-default"
      >
        {current?.label}
        {!disabled && (
          <CaretDown
            size={11}
            className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 top-[calc(100%+6px)] w-[140px] bg-paper-raised border border-rule rounded-xl py-1.5 z-50 ${CARD_SHADOW}`}
        >
          {PRIORITY_OPTIONS.map((p) => {
            const style = ACTIVITY_PRIORITY[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-left hover:bg-surface-ground cursor-pointer ${
                  p === value ? "font-semibold text-ink" : "text-ink-soft"
                }`}
              >
                <span style={{ backgroundColor: style?.bg }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                {style?.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PriorityPicker;
