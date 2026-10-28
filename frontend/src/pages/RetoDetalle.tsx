import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ProjectRow from "../components/ProjectRow";
import { useChallenge } from "../hooks/useChallenges";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";

function RetoDetalle() {
  const { id } = useParams();
  const challengeId = Number(id);
  const navigate = useNavigate();

  const { data: challenge, isLoading, isError, refetch } = useChallenge(challengeId);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <p className="flex-1 flex items-center justify-center text-ink-soft">Cargando…</p>
      </div>
    );
  }

  if (isError || !challenge) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-ink-soft">No se pudo cargar este reto. Es posible que no exista o que haya ocurrido un error.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer border border-rule text-ink hover:bg-surface-ground"
            >
              Reintentar
            </button>
            <Link
              to="/retos"
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 ${PRIMARY_BUTTON}`}
            >
              Volver a retos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mainSdg = challenge.sdgs[0]?.sdg;

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="px-8 pt-6">
        <div
          style={{
            background: `linear-gradient(135deg, ${mainSdg?.colorHex ?? "#19486A"}, ${mainSdg?.colorHex ?? "#19486A"}CC)`,
          }}
          className="relative rounded-2xl overflow-hidden h-[220px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_20px_44px_-20px_rgba(20,22,26,0.35)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,12,10,0.82),rgba(10,12,10,0)_60%)]" />
          <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {challenge.sdgs.map(({ sdg }) => (
                <span
                  key={sdg.id}
                  style={{ backgroundColor: sdg.colorHex }}
                  className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white font-data shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                >
                  ODS {String(sdg.id).padStart(2, "0")} · {sdg.name}
                </span>
              ))}
            </div>
            <h1 className="font-heading text-[28px] font-bold text-white m-0 leading-tight drop-shadow-sm">
              {challenge.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-8 px-8 py-7 items-start max-w-[1100px] mx-auto w-full">
        <section className="flex-1 min-w-0 flex flex-col gap-6">
          <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">Descripción del reto</h2>
            <p className="text-[14px] text-ink-soft leading-relaxed m-0 whitespace-pre-line">
              {challenge.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/proyectos/nuevo?challengeId=${challenge.id}`)}
            className={`self-start rounded-full text-[13.5px] font-bold py-3 px-6 cursor-pointer ${PRIMARY_BUTTON}`}
          >
            Crear proyecto a partir de este reto
          </button>

          <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
            <h2 className="font-heading text-[16px] font-bold text-ink m-0">
              Proyectos vinculados a este reto
            </h2>
            {challenge.projects.length === 0 ? (
              <p className="text-[13px] text-ink-soft m-0">
                Todavía no hay proyectos vinculados a este reto.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {challenge.projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="w-[260px] shrink-0 flex flex-col gap-5">
          <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 ${CARD_SHADOW}`}>
            <h3 className="text-[12.5px] font-semibold text-ink m-0">Organización</h3>
            <p className="text-[13px] font-semibold text-ink m-0">{challenge.organization.name}</p>
            <p className="text-[11.5px] text-ink-faint m-0 truncate">{challenge.organization.email}</p>
          </div>

          <div className={`bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 ${CARD_SHADOW}`}>
            <h3 className="text-[12.5px] font-semibold text-ink m-0">Fecha límite</h3>
            <p className="text-[13px] text-ink-soft m-0">
              {challenge.deadline
                ? new Date(challenge.deadline).toLocaleDateString("es-MX")
                : "Sin fecha límite definida"}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default RetoDetalle;
