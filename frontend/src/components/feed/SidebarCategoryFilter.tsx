import { useEffect, useRef, useState } from "react";
import { FunnelSimple, CaretDown } from "@phosphor-icons/react";
import { useCategories } from "../../hooks/useCategories";
import { CARD_SHADOW } from "../../utils/statusStyles";

function SidebarCategoryFilter({ value, onChange }: { value: number | undefined; onChange: (id: number | undefined) => void }) {
  const { data: categories } = useCategories();
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

  const selected = categories?.find((c) => c.id === value);
  const label = selected?.name ?? "Todas las categorías";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full rounded-full border px-4 py-2.5 text-[13px] cursor-pointer ${
          value !== undefined ? "border-accent-primary text-accent-primary bg-surface-ground" : "border-rule text-ink-soft bg-paper-raised"
        }`}
      >
        <FunnelSimple size={15} />
        <span className="flex-1 min-w-0 text-left truncate">{label}</span>
        <CaretDown size={13} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] w-[260px] max-h-[360px] overflow-y-auto scroll-thin bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
        >
          <div className="flex items-center justify-between px-3.5 py-1.5 mb-1">
            <span className="text-[11.5px] font-semibold text-ink-faint uppercase">Filtrar por categoría</span>
            {value !== undefined && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="text-[12px] font-semibold text-accent-primary cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
          {categories?.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onChange(category.id === value ? undefined : category.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-left hover:bg-surface-ground cursor-pointer ${
                value === category.id ? "font-semibold text-ink" : "text-ink-soft"
              }`}
            >
              <span style={{ backgroundColor: category.colorHex }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SidebarCategoryFilter;
