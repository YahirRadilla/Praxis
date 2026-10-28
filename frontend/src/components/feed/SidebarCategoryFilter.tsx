import { useCategories } from "../../hooks/useCategories";
import { CARD_SHADOW } from "../../utils/statusStyles";

function SidebarCategoryFilter({ value, onChange }: { value: number | undefined; onChange: (id: number | undefined) => void }) {
  const { data: categories } = useCategories();

  return (
    <div className={`flex flex-col gap-2.5 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
      <h3 className="text-[12px] font-semibold text-ink m-0">Filtrar por categoría</h3>
      <div className="flex flex-col gap-1.5">
        {categories?.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id === value ? undefined : category.id)}
            className={`flex items-center gap-2 text-left text-[12.5px] rounded-lg px-1.5 py-1 hover:bg-surface-ground ${
              value === category.id ? "font-semibold text-ink" : "text-ink-soft"
            }`}
          >
            <span style={{ backgroundColor: category.colorHex }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SidebarCategoryFilter;
