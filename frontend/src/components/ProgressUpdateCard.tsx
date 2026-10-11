import type { ProgressUpdate } from "../types/activity";
import { CARD_SHADOW } from "../utils/statusStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function ProgressUpdateCard({ update }: { update: ProgressUpdate }) {
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
        {update.validated && (
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
            <a
              key={ev.id}
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
            >
              {ev.fileName ?? ev.url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgressUpdateCard;
