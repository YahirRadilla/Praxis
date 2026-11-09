import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Heart } from "@phosphor-icons/react";
import type { FeedUpdate } from "../../types/activity";
import { CATEGORY_ICON_MAP } from "../../utils/categoryIcons";
import { CARD_SHADOW } from "../../utils/statusStyles";
import { timeAgo } from "../../utils/text";
import { getChipTextColor } from "../../utils/chipTextColor";
import { EvidenceGallery } from "../evidence/EvidenceGallery";
import { useAuth } from "../../context/AuthContext";
import { useLikePost, useUnlikePost } from "../../hooks/useFeed";
import { getErrorMessage } from "../../services/api";

function FeedPostCard({ update }: { update: FeedUpdate }) {
  const { isAuthenticated } = useAuth();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const mainCategory = update.project.categories[0]?.category;
  const mainSdg = update.project.sdgs[0]?.sdg;
  const CategoryIcon = mainCategory ? CATEGORY_ICON_MAP[mainCategory.icon] : undefined;
  const togglingLike = likePost.isPending || unlikePost.isPending;

  function handleToggleLike() {
    if (update.likedByMe) {
      unlikePost.mutate(update.id, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo registrar tu me gusta.")),
      });
    } else {
      likePost.mutate(update.id, {
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo registrar tu me gusta.")),
      });
    }
  }

  return (
    <article className={`flex flex-col gap-3 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link to={`/usuarios/${update.author.id}`} className="shrink-0">
          <span className="w-9 h-9 rounded-full bg-surface-accent flex items-center justify-center text-[13px] font-bold text-ink">
            {update.author.name.charAt(0).toUpperCase()}
          </span>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/usuarios/${update.author.id}`} className="hover:underline">
            <span className="text-[13px] font-semibold text-ink">{update.author.name}</span>
          </Link>
          <p className="text-[11.5px] text-ink-faint m-0">
            <Link to={`/proyectos/${update.project.id}`} className="hover:underline">
              {update.project.name}
            </Link>{" "}
            · {timeAgo(update.createdAt)}
          </p>
        </div>
        {(mainCategory || mainSdg) && (
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto pl-[46px] sm:pl-0">
            {mainCategory && (
              <span
                style={{ backgroundColor: mainCategory.colorHex, color: getChipTextColor(mainCategory.colorHex) }}
                className="flex items-center gap-1 text-[10px] font-bold rounded px-2 py-1"
              >
                {CategoryIcon && <CategoryIcon size={12} weight="bold" />}
                {mainCategory.name}
              </span>
            )}
            {mainSdg && (
              <span
                style={{ backgroundColor: mainSdg.colorHex, color: getChipTextColor(mainSdg.colorHex) }}
                className="text-[10px] font-bold rounded px-2 py-1"
              >
                ODS {mainSdg.id}
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-[13.5px] text-ink leading-relaxed m-0">{update.text}</p>

      <EvidenceGallery evidence={update.evidence} />

      {isAuthenticated && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-rule">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={togglingLike}
            aria-pressed={update.likedByMe}
            aria-label={update.likedByMe ? "Quitar me gusta" : "Me gusta"}
            className="flex items-center gap-1.5 rounded-full text-[12.5px] font-semibold text-ink-soft py-1.5 px-2.5 -ml-2.5 mt-1 cursor-pointer hover:bg-surface-ground disabled:opacity-60"
          >
            <Heart
              size={16}
              weight={update.likedByMe ? "fill" : "bold"}
              className={update.likedByMe ? "text-danger" : undefined}
            />
            {update.likeCount}
          </button>
        </div>
      )}
    </article>
  );
}

export default FeedPostCard;
