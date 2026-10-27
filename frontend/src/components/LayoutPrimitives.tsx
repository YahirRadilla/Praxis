import type { ReactNode } from "react";
import { CARD_SHADOW } from "../utils/statusStyles";

export function Lateral({ children }: { children: ReactNode }) {
  return <aside className="w-[260px] shrink-0 flex flex-col gap-5">{children}</aside>;
}

export function LateralCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 ${CARD_SHADOW}`}>
      <h3 className="text-[12.5px] font-semibold text-ink m-0">{title}</h3>
      {children}
    </div>
  );
}
