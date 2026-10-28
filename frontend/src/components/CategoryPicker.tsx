import { CheckCircle } from "@phosphor-icons/react";
import type { Category } from "../types/project";
import { CATEGORY_ICON_MAP } from "../utils/categoryIcons";

const MAX_CATEGORIES = 3;

interface CategoryPickerProps {
  categories: Category[];
  value: number[];
  onChange: (ids: number[]) => void;
}

function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const atCap = value.length >= MAX_CATEGORIES;

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (atCap) return;
    onChange([...value, id]);
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
      {categories.map((category) => {
        const selected = value.includes(category.id);
        const disabled = !selected && atCap;
        const Icon = CATEGORY_ICON_MAP[category.icon];
        return (
          <button
            key={category.id}
            type="button"
            title={category.name}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(category.id)}
            className={`flex flex-col rounded-lg border-2 p-0 overflow-hidden transition-all ${
              disabled
                ? "border-transparent opacity-60 cursor-not-allowed"
                : "cursor-pointer"
            } ${
              selected
                ? "border-accent-primary shadow-[0_0_0_3px_rgba(45,94,58,0.18)] scale-[1.02]"
                : !disabled
                  ? "border-transparent hover:border-ink-faint"
                  : ""
            }`}
          >
            <span
              style={{ backgroundColor: category.colorHex }}
              className="relative h-[100px] w-full flex flex-col items-center justify-center gap-1.5 px-2"
            >
              {selected && (
                <span className="absolute top-1 right-1 bg-paper-raised rounded-full flex items-center justify-center">
                  <CheckCircle size={18} weight="fill" color="var(--color-accent-primary)" />
                </span>
              )}
              {Icon && <Icon size={26} weight="bold" color="#FFFFFF" />}
              <span className="text-[10.5px] font-bold text-white text-center leading-[1.2]">
                {category.name}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default CategoryPicker;
