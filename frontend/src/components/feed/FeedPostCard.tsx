import { Link } from "react-router-dom";
import type { FeedUpdate } from "../../types/activity";
import { CARD_SHADOW } from "../../utils/statusStyles";
import { timeAgo } from "../../utils/text";

function FeedPostCard({ update }: { update: FeedUpdate }) {
  const mainSdg = update.project.sdgs[0]?.sdg;

  return (
    <article className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-surface-accent flex items-center justify-center text-[13px] font-bold text-ink shrink-0">
          {update.author.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-ink">{update.author.name}</span>
          <p className="text-[11.5px] text-ink-faint m-0">
            <Link to={`/proyectos/${update.project.id}`} className="hover:underline">
              {update.project.name}
            </Link>{" "}
            · {timeAgo(update.createdAt)}
          </p>
        </div>
        {mainSdg && (
          <span
            style={{ backgroundColor: mainSdg.colorHex }}
            className="text-[10px] font-bold text-white rounded px-2 py-1 shrink-0"
          >
            ODS {mainSdg.id}
          </span>
        )}
      </div>

      <p className="text-[13.5px] text-ink leading-relaxed m-0">{update.text}</p>

      {update.evidence.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {update.evidence.map((ev) => (
            <a
              key={ev.id}
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="bg-paper border border-rule rounded-lg px-3 py-1.5 font-data text-[11px] text-ink-soft"
            >
              {ev.fileName ?? ev.url}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export default FeedPostCard;
