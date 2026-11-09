import { CheckCircle } from "@phosphor-icons/react";
import type { Sdg } from "../types/project";
import { SDG_ICONS } from "../utils/sdgIcons";

interface SdgPickerProps {
  sdgs: Sdg[];
  value: number[];
  onChange: (ids: number[]) => void;
}

function SdgPicker({ sdgs, value, onChange }: SdgPickerProps) {
  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
      {sdgs.map((sdg) => {
        const selected = value.includes(sdg.id);
        const Icon = SDG_ICONS[sdg.id];
        return (
          <button
            key={sdg.id}
            type="button"
            title={sdg.name}
            aria-pressed={selected}
            onClick={() => toggle(sdg.id)}
            className={`flex flex-col rounded-lg border-2 p-0 overflow-hidden cursor-pointer transition-all ${
              selected
                ? "border-accent-primary shadow-[0_0_0_3px_rgba(45,94,58,0.18)] scale-[1.02]"
                : "border-transparent hover:border-ink-faint"
            }`}
          >
            <span
              style={{ backgroundColor: sdg.colorHex }}
              className="relative h-[100px] w-full flex flex-col items-center justify-center gap-1.5 px-2"
            >
              {/* Fixed dark scrim (not a theme token — darkens the raw
                  colorHex consistently in both themes) so white text/icons
                  read at WCAG AA on every SDG color, instead of flipping
                  text black/white per-tile by luminance. */}
              <span className="absolute inset-0 bg-black/50" />
              <span className="absolute top-1.5 left-1.5 bg-white/25 rounded-full w-5 h-5 flex items-center justify-center">
                <span className="font-data text-[9px] font-bold leading-none text-white">
                  {String(sdg.id).padStart(2, "0")}
                </span>
              </span>
              {selected && (
                <span className="absolute top-1 right-1 bg-paper-raised rounded-full flex items-center justify-center">
                  <CheckCircle size={18} weight="fill" color="var(--color-accent-primary)" />
                </span>
              )}
              {Icon && <Icon size={26} weight="bold" className="relative text-white" />}
              <span className="relative text-[10.5px] font-bold text-center leading-[1.2] text-white">
                {sdg.name}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SdgPicker;
