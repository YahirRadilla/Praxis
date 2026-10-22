import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { ProjectPersonRef } from "../types/project";
import { useSearchUsers } from "../hooks/useUsers";
import { CARD_SHADOW } from "../utils/statusStyles";

interface UserPickerProps {
  accountType?: "TEACHER" | "ORGANIZATION";
  label: string;
  placeholder: string;
  value: ProjectPersonRef | null;
  onChange: (user: ProjectPersonRef | null) => void;
}

function UserPicker({ accountType, label, placeholder, value, onChange }: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: users, isLoading } = useSearchUsers(accountType, debouncedQuery);

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

  function handleSelect(user: ProjectPersonRef) {
    onChange(user);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref}>
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-3 text-[13px] cursor-pointer ${
          value ? "border-accent-primary text-ink bg-paper" : "border-rule text-ink-faint bg-paper"
        }`}
      >
        <span className="truncate">{value ? value.name : placeholder}</span>
        <CaretDown size={13} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+4px)] w-full max-h-[320px] overflow-y-auto bg-paper-raised border border-rule rounded-xl py-2 z-50 ${CARD_SHADOW}`}
        >
          <div className="px-2.5 pb-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink focus:outline-2 focus:outline-offset-1 focus:outline-accent-primary"
            />
          </div>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-left px-3.5 py-2 text-[12.5px] font-semibold text-accent-primary hover:bg-surface-ground cursor-pointer"
            >
              Quitar selección
            </button>
          )}

          {isLoading && <p className="px-3.5 py-2 text-[12.5px] text-ink-faint m-0">Buscando…</p>}

          {!isLoading && users?.length === 0 && debouncedQuery && (
            <p className="px-3.5 py-2 text-[12.5px] text-ink-faint m-0">Sin resultados</p>
          )}

          {!isLoading &&
            users?.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full flex flex-col items-start px-3.5 py-2 text-left hover:bg-surface-ground cursor-pointer"
              >
                <span className="text-[13px] text-ink">{user.name}</span>
                <span className="text-[11.5px] text-ink-faint">{user.email}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default UserPicker;
