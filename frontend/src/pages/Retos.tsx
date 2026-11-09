import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SdgMultiSelect from "../components/SdgMultiSelect";
import CategoryMultiSelect from "../components/CategoryMultiSelect";
import { useAuth } from "../context/AuthContext";
import { useChallenges } from "../hooks/useChallenges";
import { useSdgs } from "../hooks/useSdgs";
import { useCategories } from "../hooks/useCategories";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import { getChipTextColor } from "../utils/chipTextColor";
import { pluralize } from "../utils/text";
import { CHALLENGE_CREATOR_TYPES } from "../utils/challengeCreators";

function Retos() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [sdgIds, setSdgIds] = useState<number[]>([]);
  const { data: categories } = useCategories();
  const { data: sdgs } = useSdgs();
  const { data: challenges, isLoading } = useChallenges({ q: q || undefined, categoryIds, sdgIds });
  const canPublish = user ? CHALLENGE_CREATOR_TYPES.includes(user.accountType) : false;

  function handleSearch(value: string) {
    setQ(value);
    setSearchParams(value ? { q: value } : {});
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <header className="bg-paper-raised border-b border-rule px-8 py-7 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-[26px] font-bold text-ink m-0">Retos</h1>
            <p className="text-[13px] text-ink-soft m-0">
              Problemáticas publicadas por organizaciones y docentes para que tu equipo las resuelva.
            </p>
          </div>
          {canPublish && (
            <Link
              to="/retos/nuevo"
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 shrink-0 ${PRIMARY_BUTTON}`}
            >
              + Publicar un reto
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar retos por título o descripción"
            className="flex-1 min-w-[240px] max-w-[500px] border border-rule rounded-full bg-paper px-5 py-3 text-[13.5px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
          <CategoryMultiSelect categories={categories ?? []} value={categoryIds} onChange={setCategoryIds} />
          <SdgMultiSelect sdgs={sdgs ?? []} value={sdgIds} onChange={setSdgIds} />
        </div>
      </header>

      <div className="flex-1 px-8 py-7">
        <p className="text-[12.5px] text-ink-faint m-0 mb-4">
          {isLoading
            ? "Cargando…"
            : `${challenges?.length ?? 0} ${pluralize(challenges?.length ?? 0, "reto encontrado", "retos encontrados")}`}
        </p>

        {!isLoading && challenges?.length === 0 && (
          <p className="text-[13px] text-ink-soft">No se encontraron retos con estos filtros.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges?.map((challenge) => {
            const mainSdg = challenge.sdgs[0]?.sdg;
            return (
              <Link
                key={challenge.id}
                to={`/retos/${challenge.id}`}
                className={`flex flex-col bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW} hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_18px_40px_-16px_rgba(20,22,26,0.3)] hover:-translate-y-0.5`}
              >
                <div
                  style={{
                    background: mainSdg
                      ? `linear-gradient(150deg, ${mainSdg.colorHex}, ${mainSdg.colorHex}99)`
                      : "#19486A",
                  }}
                  className="relative h-[90px] flex items-start gap-1.5 p-2.5 flex-wrap"
                >
                  {challenge.bannerUrl && (
                    <>
                      <img
                        src={challenge.bannerUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,12,10,0.35),rgba(10,12,10,0)_60%)]" />
                    </>
                  )}
                  {challenge.sdgs.map(({ sdg }) => (
                    <span
                      key={sdg.id}
                      style={{ backgroundColor: sdg.colorHex, color: getChipTextColor(sdg.colorHex) }}
                      className="relative rounded-full px-2.5 py-1 text-[10px] font-bold font-data shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                    >
                      ODS {String(sdg.id).padStart(2, "0")}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-2 p-4">
                  <h3 className="font-heading text-[15.5px] font-semibold text-ink m-0 leading-snug">
                    {challenge.title}
                  </h3>
                  <p className="text-[12.5px] text-ink-soft m-0 line-clamp-2 min-h-[32px]">
                    {challenge.description}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11.5px] text-ink-faint truncate">
                      {challenge.organization.name}
                    </span>
                    {challenge.deadline && (
                      <span className="text-[11px] font-semibold text-ink-soft shrink-0">
                        Vence {new Date(challenge.deadline).toLocaleDateString("es-MX")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Retos;
