import Navbar from "../components/Navbar";
import Skeleton from "../components/Skeleton";
import { useImpact } from "../hooks/useImpact";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import type { ImpactStats } from "../types/impact";

interface StatTileProps {
  value: string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div className={`bg-paper-raised border border-rule rounded-xl p-5 flex flex-col gap-1.5 ${CARD_SHADOW}`}>
      <p className="font-heading text-[32px] font-bold text-accent-primary m-0 leading-none">{value}</p>
      <p className="text-[12.5px] text-ink-soft m-0 leading-snug">{label}</p>
    </div>
  );
}

interface BarRow {
  key: number;
  name: string;
  colorHex: string;
  count: number;
}

function ImpactBarChart({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: BarRow[];
  emptyLabel: string;
}) {
  const maxCount = rows.reduce((max, row) => Math.max(max, row.count), 1);

  return (
    <div className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
      <h2 className="font-heading text-[16px] font-bold text-ink m-0">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-ink-soft m-0">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const widthPct = Math.max((row.count / maxCount) * 100, 4);
            return (
              <div key={row.key} className="flex items-center gap-3" title={`${row.name}: ${row.count}`}>
                <span className="w-[150px] md:w-[180px] shrink-0 text-[12.5px] text-ink-soft truncate">
                  {row.name}
                </span>
                <div className="flex-1 h-[16px] bg-surface-ground rounded-lg overflow-hidden">
                  <div
                    style={{ width: `${widthPct}%`, backgroundColor: row.colorHex }}
                    className="h-full rounded-lg"
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[12.5px] font-bold text-ink font-data">
                  {row.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ImpactoContent({ stats }: { stats: ImpactStats }) {
  const { challengesWithProposals } = stats;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatTile value={String(stats.totalPublicProjects)} label="Proyectos publicados" />
        <StatTile
          value={String(stats.acceptedTeamRequests)}
          label="Solicitudes de participación aceptadas"
        />
        <StatTile
          value={`${stats.pctWithProgressUpdates}%`}
          label="De los proyectos tienen al menos un avance registrado"
        />
        <StatTile
          value={`${stats.pctWithMultipleMembers}%`}
          label="De los proyectos tienen más de un integrante"
        />
        <StatTile
          value={String(challengesWithProposals.withProposals)}
          label={`De ${challengesWithProposals.total} retos tienen al menos una propuesta vinculada`}
        />
        <StatTile
          value={`${stats.pctWithSignedEvaluation}%`}
          label="De los proyectos tienen retroalimentación de evaluador"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImpactBarChart
          title="Proyectos por categoría"
          emptyLabel="Todavía no hay proyectos públicos clasificados por categoría."
          rows={stats.projectsByCategory.map((row) => ({
            key: row.categoryId,
            name: row.name,
            colorHex: row.colorHex,
            count: row.count,
          }))}
        />
        <ImpactBarChart
          title="Proyectos por ODS"
          emptyLabel="Todavía no hay proyectos públicos clasificados por ODS."
          rows={stats.projectsBySdg.map((row) => ({
            key: row.sdgId,
            name: row.name,
            colorHex: row.colorHex,
            count: row.count,
          }))}
        />
      </div>
    </>
  );
}

function ImpactoSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`bg-paper-raised border border-rule rounded-xl p-5 flex flex-col gap-2 ${CARD_SHADOW}`}>
            <Skeleton width={64} height={32} />
            <Skeleton width="80%" height={14} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={`bg-paper-raised border border-rule rounded-xl p-6 flex flex-col gap-4 ${CARD_SHADOW}`}>
            <Skeleton width="50%" height={16} />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} width="100%" height={16} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Impacto() {
  const { data: stats, isLoading, isError, refetch } = useImpact();

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col gap-6 px-4 md:px-8 py-7 max-w-[1100px] mx-auto w-full">
        <header className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[24px] font-bold text-ink m-0">Impacto de Praxis</h1>
          <p className="text-[13.5px] text-ink-soft m-0 max-w-[640px]">
            Praxis en números: el impacto real de los proyectos en la plataforma, medido con los
            mismos criterios de éxito definidos para esta etapa.
          </p>
        </header>

        {isLoading && <ImpactoSkeleton />}

        {isError && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-10">
            <p className="text-ink-soft">
              No se pudieron cargar las estadísticas de impacto. Intenta de nuevo en unos momentos.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 cursor-pointer ${PRIMARY_BUTTON}`}
            >
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !isError && stats && <ImpactoContent stats={stats} />}
      </div>
    </div>
  );
}

export default Impacto;
