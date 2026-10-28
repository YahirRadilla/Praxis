import type { Evidence, ProgressUpdate } from "../types/activity";
import { CARD_SHADOW } from "../utils/statusStyles";
import { FileText } from "@phosphor-icons/react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VIDEO_EXTENSIONS = [".mp4"];

function extensionOf(ev: Evidence): string {
  const source = ev.fileName ?? ev.url;
  const match = source.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export function EvidenceItem({ ev }: { ev: Evidence }) {
  if (ev.type === "FILE") {
    const ext = extensionOf(ev);

    if (IMAGE_EXTENSIONS.includes(ext)) {
      return (
        <a href={ev.url} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={ev.url}
            alt={ev.fileName ?? "Evidencia"}
            className="w-24 h-24 object-cover rounded-lg border border-rule"
          />
        </a>
      );
    }

    if (VIDEO_EXTENSIONS.includes(ext)) {
      return (
        <video controls src={ev.url} className="max-w-[260px] rounded-lg border border-rule">
          Tu navegador no soporta la reproducción de video.
        </video>
      );
    }

    return (
      <a
        href={ev.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
      >
        <FileText size={14} />
        {ev.fileName ?? ev.url}
      </a>
    );
  }

  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noreferrer"
      className="bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
    >
      {ev.fileName ?? ev.url}
    </a>
  );
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
            style={{ backgroundColor: "#E8F1F7", color: "#00689D" }}
            className="rounded-full px-[11px] py-1.5 text-[11px] font-semibold shrink-0"
          >
            Validado
          </span>
        )}
      </div>

      <p className="text-ink-soft text-[13.5px] leading-relaxed m-0">{update.text}</p>

      {update.evidence.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {update.evidence.map((ev) => (
            <EvidenceItem key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgressUpdateCard;
