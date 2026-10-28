import { useEffect, useRef, useState } from "react";
import { FunnelSimple, CaretDown } from "@phosphor-icons/react";
import type { Category } from "../types/project";
import { CARD_SHADOW } from "../utils/statusStyles";
import { pluralize } from "../utils/text";

interface CategoryMultiSelectProps {
  categories: Category[];
  value: number[];
  onChange: (ids: number[]) => void;
}

function CategoryMultiSelect({ categories, value, onChange }: CategoryMultiSelectProps) {
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
      ? "Todas las categorías"
      : `${value.length} ${pluralize(value.length, "categoría seleccionada", "categorías seleccionadas")}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] cursor-pointer ${
          value.length > 0 ? "border-accent-primary text-accent-primary bg-surface-ground" : "border-rule text-ink-soft bg-paper-raised"
        }`}
      >
        <FunnelSimple size={15} />
        {label}
        <CaretDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] w-[300px] max-h-[360px] overflow-y-auto bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
        >
          <div className="flex items-center justify-between px-3.5 py-1.5 mb-1">
            <span className="text-[11.5px] font-semibold text-ink-faint uppercase">Filtrar por categoría</span>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[12px] font-semibold text-accent-primary cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-surface-ground cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(category.id)}
                onChange={() => toggle(category.id)}
                className="accent-accent-primary w-[15px] h-[15px] cursor-pointer"
              />
              <span style={{ backgroundColor: category.colorHex }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
              {category.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryMultiSelect;
