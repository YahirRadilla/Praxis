import type { ProgressUpdate } from "../types/activity";
import { CARD_SHADOW } from "../utils/statusStyles";
import { EvidenceGallery } from "./evidence/EvidenceGallery";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

interface ProgressUpdateCardProps {
  update: ProgressUpdate;
  /**
   * When true, renders this as a casual project-feed post rather than a
   * formal progress entry: hides the "Validado" badge, which implies review
   * that this context doesn't have. Used by the "Avances generales" card on
   * ProjectDetail; the Inicio/main feed keeps the default (non-casual)
   * rendering.
   */
  casual?: boolean;
}

function ProgressUpdateCard({ update, casual = false }: ProgressUpdateCardProps) {
  return (
    <div className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-[18px] ${CARD_SHADOW}`}>
      <div className="flex items-center gap-[11px]">
        <span
          style={{ borderColor: "#26BDE2" }}
          className="w-[38px] h-[38px] rounded-full bg-surface-accent border-2 flex items-center justify-center text-[14px] font-bold text-ink shrink-0"
        >
          {update.author.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-heading text-[14px] font-bold text-ink">{update.author.name}</span>
          <span className="text-[11.5px] text-ink-faint truncate">
            {update.activity ? `${update.activity.title} · ` : ""}
            {formatDate(update.createdAt)}
          </span>
        </div>
        {!casual && update.validated && (
          <span
            style={{ backgroundColor: "var(--color-badge-validated-bg)", color: "var(--color-badge-validated-fg)" }}
            className="rounded-full px-[11px] py-1.5 text-[11px] font-semibold shrink-0"
          >
            Validado
          </span>
        )}
      </div>

      <p className="text-ink-soft text-[13.5px] leading-relaxed m-0">{update.text}</p>

      <EvidenceGallery evidence={update.evidence} />
    </div>
  );
}

export default ProgressUpdateCard;
