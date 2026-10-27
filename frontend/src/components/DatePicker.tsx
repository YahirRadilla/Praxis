import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { CalendarBlank } from "@phosphor-icons/react";
import { DayPicker, type ClassNames } from "react-day-picker";
import { es } from "date-fns/locale";
import { CARD_SHADOW } from "../utils/statusStyles";

/** Parses a "YYYY-MM-DD" string into a local `Date` (avoids UTC off-by-one). */
function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Formats a local `Date` back into a "YYYY-MM-DD" string. */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const DAY_PICKER_CLASS_NAMES: Partial<ClassNames> = {
  months: "flex",
  month: "flex flex-col gap-2",
  month_caption: "flex items-center justify-center h-8 relative",
  caption_label: "text-[12.5px] font-semibold text-ink capitalize",
  nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8",
  button_previous:
    "w-7 h-7 flex items-center justify-center rounded-full text-ink-faint hover:bg-surface-ground hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-default",
  button_next:
    "w-7 h-7 flex items-center justify-center rounded-full text-ink-faint hover:bg-surface-ground hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-default",
  chevron: "fill-current",
  month_grid: "mt-1 border-collapse",
  weekdays: "",
  weekday: "text-[10px] font-semibold uppercase text-ink-faint w-8 h-7 text-center",
  weeks: "",
  week: "",
  day: "group p-0 text-center align-middle",
  day_button:
    "w-8 h-8 rounded-lg text-[12.5px] text-ink flex items-center justify-center cursor-pointer hover:bg-surface-ground disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent group-data-[today=true]:font-bold group-data-[selected=true]:bg-accent-primary group-data-[selected=true]:text-fg-inverse group-data-[selected=true]:hover:bg-accent-primary group-data-[outside=true]:text-ink-faint",
};

interface DatePickerProps {
  /** ISO date string ("YYYY-MM-DD"), matching native `<input type="date">`. */
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Purely visual: callers that enforce "required" must still validate it themselves. */
  required?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

function DatePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Seleccionar fecha",
  id,
  "aria-label": ariaLabel,
  className = "",
}: DatePickerProps) {
  const selected = parseIsoDate(value);

  return (
    <Popover className="relative inline-block">
      {({ close }) => (
        <>
          <PopoverButton
            id={id}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-required={required}
            className={`flex items-center gap-2 border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-left cursor-pointer disabled:opacity-70 disabled:cursor-default ${
              selected ? "text-ink" : "text-ink-faint"
            } ${className}`}
          >
            <CalendarBlank size={14} className="text-ink-faint shrink-0" />
            <span className="flex-1 min-w-0 truncate">
              {selected ? formatDisplayDate(selected) : placeholder}
            </span>
          </PopoverButton>

          <PopoverPanel
            anchor="bottom start"
            transition
            className={`z-50 mt-2 bg-paper-raised border border-rule rounded-xl p-3 transition duration-150 motion-reduce:transition-none data-closed:opacity-0 data-closed:scale-95 origin-top ${CARD_SHADOW}`}
          >
            <DayPicker
              mode="single"
              locale={es}
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) => {
                onChange(date ? toIsoDate(date) : null);
                close();
              }}
              classNames={DAY_PICKER_CLASS_NAMES}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

export default DatePicker;
