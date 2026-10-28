import { useState } from "react";
import Navbar from "../components/Navbar";
import ProfileSidebarCard from "../components/feed/ProfileSidebarCard";
import SidebarNav from "../components/feed/SidebarNav";
import SidebarSdgFilter from "../components/feed/SidebarSdgFilter";
import SidebarCategoryFilter from "../components/feed/SidebarCategoryFilter";
import CreateProjectCallout from "../components/feed/CreateProjectCallout";
import FeedComposer from "../components/feed/FeedComposer";
import FeedPostCard from "../components/feed/FeedPostCard";
import { useFeed } from "../hooks/useFeed";

function Inicio() {
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const { data: feed, isLoading } = useFeed(categoryId);
  const [sdgId, setSdgId] = useState<number | undefined>(undefined);

  const visiblePosts = feed?.filter(
    (post) => sdgId === undefined || post.project.sdgs.some(({ sdg }) => sdg.id === sdgId),
  );

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-full md:w-[260px] md:shrink-0 flex flex-col gap-4">
          <ProfileSidebarCard />
          <SidebarNav />
          <SidebarCategoryFilter value={categoryId} onChange={setCategoryId} />
          <SidebarSdgFilter value={sdgId} onChange={setSdgId} />
          <CreateProjectCallout />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <FeedComposer />

          {isLoading && <p className="text-[13px] text-ink-soft text-center">Cargando…</p>}
          {!isLoading && visiblePosts?.length === 0 && (
            <p className="text-[13px] text-ink-soft text-center">
              Todavía no hay avances publicados en el feed.
            </p>
          )}

          {visiblePosts?.map((post) => (
            <FeedPostCard key={post.id} update={post} />
          ))}
        </section>
      </div>
    </div>
  );
}

export default Inicio;
