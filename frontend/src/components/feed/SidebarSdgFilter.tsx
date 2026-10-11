import { Link } from "react-router-dom";
import { useSdgs } from "../../hooks/useSdgs";
import { CARD_SHADOW } from "../../utils/statusStyles";

function SidebarSdgFilter({ value, onChange }: { value: number | undefined; onChange: (id: number | undefined) => void }) {
  const { data: sdgs } = useSdgs();
  const preview = sdgs?.slice(0, 4) ?? [];

  return (
    <div className={`flex flex-col gap-2.5 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
      <h3 className="text-[12px] font-semibold text-ink m-0">Filtrar por ODS</h3>
      <div className="flex flex-col gap-1.5">
        {preview.map((sdg) => (
          <button
            key={sdg.id}
            type="button"
            onClick={() => onChange(sdg.id === value ? undefined : sdg.id)}
            className={`flex items-center gap-2 text-left text-[12.5px] rounded-lg px-1.5 py-1 hover:bg-surface-ground ${
              value === sdg.id ? "font-semibold text-ink" : "text-ink-soft"
            }`}
          >
            <span style={{ backgroundColor: sdg.colorHex }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
            {sdg.name}
          </button>
        ))}
      </div>
      <Link to="/explorar" className="text-[12px] font-semibold text-accent-primary">
        Ver los 17 objetivos
      </Link>
    </div>
  );
}

export default SidebarSdgFilter;
