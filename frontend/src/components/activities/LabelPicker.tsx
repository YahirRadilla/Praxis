import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CaretDown, Plus, Tag } from "@phosphor-icons/react";
import { useCreateLabel, useLabels } from "../../hooks/useLabels";
import { getErrorMessage } from "../../services/api";
import { CARD_SHADOW } from "../../utils/statusStyles";
import { pluralize } from "../../utils/text";

interface LabelPickerProps {
  projectId: number;
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

const DEFAULT_SWATCH = "#19486A";

function LabelPicker({ projectId, value, onChange, disabled }: LabelPickerProps) {
  const { data: labels } = useLabels(projectId);
  const createLabel = useCreateLabel(projectId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState(DEFAULT_SWATCH);
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
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createLabel.mutate(
      { name, colorHex },
      {
        onSuccess: (label) => {
          setName("");
          setColorHex(DEFAULT_SWATCH);
          setCreating(false);
          onChange([...value, label.id]);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear la etiqueta.")),
      },
    );
  }

  const label =
    value.length === 0 ? "Sin etiquetas" : `${value.length} ${pluralize(value.length, "etiqueta", "etiquetas")}`;

  if (disabled) {
    const selected = labels?.filter((l) => value.includes(l.id)) ?? [];
    if (selected.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {selected.map((l) => (
          <span
            key={l.id}
            style={{ backgroundColor: `${l.colorHex}22`, color: l.colorHex }}
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          >
            {l.name}
          </span>
        ))}
      </div>
    );
  }

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
        <Tag size={14} />
        {label}
        <CaretDown
          size={12}
          className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] w-[240px] max-h-[320px] overflow-y-auto bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
        >
          {labels?.length === 0 && !creating && (
            <p className="text-[12px] text-ink-faint px-3.5 py-2 m-0">Este proyecto no tiene etiquetas.</p>
          )}
          {labels?.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-ink hover:bg-surface-ground cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(l.id)}
                onChange={() => toggle(l.id)}
                className="accent-accent-primary w-[14px] h-[14px] cursor-pointer"
              />
              <span style={{ backgroundColor: l.colorHex }} className="w-3 h-3 rounded-full shrink-0" />
              {l.name}
            </label>
          ))}

          <div className="border-t border-rule mt-1 pt-1">
            {creating ? (
              <form onSubmit={handleCreate} className="flex items-center gap-1.5 px-3 py-1.5">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-6 h-6 shrink-0 cursor-pointer rounded border border-rule"
                  aria-label="Color de la etiqueta"
                />
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 min-w-0 border border-rule rounded-lg bg-paper px-2 py-1 text-[12px] text-ink"
                />
                <button
                  type="submit"
                  disabled={createLabel.isPending}
                  className="text-[11.5px] font-bold text-accent-primary cursor-pointer shrink-0 disabled:opacity-60"
                >
                  Crear
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-[12.5px] text-ink-soft hover:bg-surface-ground cursor-pointer"
              >
                <Plus size={14} />
                Nueva etiqueta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LabelPicker;
