import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useJoinedClassGroups, useMyClassGroups, useSearchClassGroups } from "../hooks/useClassGroups";
import type { ClassGroup } from "../types/class-group";
import { classGroupCounts } from "../utils/classGroup";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../utils/statusStyles";
import { pluralize } from "../utils/text";

function ClassGroupCard({ classGroup }: { classGroup: ClassGroup }) {
  const counts = classGroupCounts(classGroup);
  return (
    <Link
      to={`/grupos-clase/${classGroup.id}`}
      className={`flex flex-col gap-1.5 bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW} hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_16px_36px_-14px_rgba(20,22,26,0.28)] hover:-translate-y-0.5`}
    >
      <h3 className="font-heading text-[15px] font-semibold text-ink m-0">{classGroup.name}</h3>
      <p className="text-[12.5px] text-ink-soft m-0 line-clamp-2">{classGroup.description}</p>
      <p className="text-[11.5px] text-ink-faint m-0">{classGroup.teacher.name}</p>
      <p className="text-[11.5px] text-ink-faint m-0">
        {counts.resources} {pluralize(counts.resources, "documento", "documentos")} ·{" "}
        {counts.members} {pluralize(counts.members, "alumno", "alumnos")} ·{" "}
        {counts.projects} {pluralize(counts.projects, "proyecto", "proyectos")}
      </p>
    </Link>
  );
}

function MisGruposClase() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const { data: results, isLoading } = useSearchClassGroups(q || undefined);

  const isTeacher = user?.accountType === "TEACHER";
  const { data: myClassGroups, isLoading: isLoadingMine } = useMyClassGroups();
  const { data: joinedClassGroups, isLoading: isLoadingJoined } = useJoinedClassGroups();

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
            <h1 className="font-heading text-[26px] font-bold text-ink m-0">Grupos de clase</h1>
            <p className="text-[13px] text-ink-soft m-0">
              Busca grupos de clase o revisa los que ya tienes.
            </p>
          </div>
          {isTeacher && (
            <Link
              to="/grupos-clase/nuevo"
              className={`rounded-full text-[13px] font-bold py-2.5 px-5 shrink-0 ${PRIMARY_BUTTON}`}
            >
              + Crear grupo de clase
            </Link>
          )}
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar grupos de clase por nombre o descripción"
          className="flex-1 min-w-[240px] max-w-[500px] border border-rule rounded-full bg-paper px-5 py-3 text-[13.5px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
        />
      </header>

      <div className="flex-1 px-8 py-7 flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <p className="text-[12.5px] text-ink-faint m-0">
            {isLoading
              ? "Cargando…"
              : `${results?.length ?? 0} ${pluralize(results?.length ?? 0, "grupo encontrado", "grupos encontrados")}`}
          </p>

          {!isLoading && results?.length === 0 && (
            <p className="text-[13px] text-ink-soft">No se encontraron grupos de clase con esa búsqueda.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results?.map((classGroup) => (
              <ClassGroupCard key={classGroup.id} classGroup={classGroup} />
            ))}
          </div>
        </section>

        {!isAuthenticated && (
          <p className="text-[13px] text-ink-soft">
            Inicia sesión para unirte a un grupo de clase o crear el tuyo.
          </p>
        )}

        {isAuthenticated && isTeacher && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-[18px] font-bold text-ink m-0">Mis grupos</h2>
            {isLoadingMine && <p className="text-[13px] text-ink-soft">Cargando…</p>}
            {!isLoadingMine && myClassGroups?.length === 0 && (
              <p className="text-[13px] text-ink-soft">Todavía no has creado ningún grupo de clase.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myClassGroups?.map((classGroup) => (
                <ClassGroupCard key={classGroup.id} classGroup={classGroup} />
              ))}
            </div>
          </section>
        )}

        {isAuthenticated && !isTeacher && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-[18px] font-bold text-ink m-0">Grupos a los que me uní</h2>
            {isLoadingJoined && <p className="text-[13px] text-ink-soft">Cargando…</p>}
            {!isLoadingJoined && joinedClassGroups?.length === 0 && (
              <p className="text-[13px] text-ink-soft">Todavía no te has unido a ningún grupo de clase.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {joinedClassGroups?.map((classGroup) => (
                <ClassGroupCard key={classGroup.id} classGroup={classGroup} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default MisGruposClase;
