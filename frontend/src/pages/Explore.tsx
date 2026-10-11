import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ProjectCard from "../components/ProjectCard";
import SdgMultiSelect from "../components/SdgMultiSelect";
import { useSearchProjects } from "../hooks/useProjects";
import { useSdgs } from "../hooks/useSdgs";
import { PRIMARY_BUTTON } from "../utils/statusStyles";
import { pluralize } from "../utils/text";

function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sdgIds, setSdgIds] = useState<number[]>([]);
  const { data: sdgs } = useSdgs();
  const { data: projects, isLoading } = useSearchProjects({ q: q || undefined, sdgIds });

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
            <h1 className="font-heading text-[26px] font-bold text-ink m-0">Explorar proyectos</h1>
            <p className="text-[13px] text-ink-soft m-0">Descubrí proyectos reales creados por tu comunidad.</p>
          </div>
          <Link
            to="/proyectos/nuevo"
            className={`rounded-full text-[13px] font-bold py-2.5 px-5 shrink-0 ${PRIMARY_BUTTON}`}
          >
            + Crear proyecto
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar proyectos por nombre o descripción"
            className="flex-1 min-w-[240px] max-w-[500px] border border-rule rounded-full bg-paper px-5 py-3 text-[13.5px] text-ink focus:outline-2 focus:outline-accent-primary focus:outline-offset-1"
          />
          <SdgMultiSelect sdgs={sdgs ?? []} value={sdgIds} onChange={setSdgIds} />
        </div>
      </header>

      <div className="flex-1 px-8 py-7">
        <p className="text-[12.5px] text-ink-faint m-0 mb-4">
          {isLoading
            ? "Cargando…"
            : `${projects?.length ?? 0} ${pluralize(projects?.length ?? 0, "proyecto encontrado", "proyectos encontrados")}`}
        </p>

        {!isLoading && projects?.length === 0 && (
          <p className="text-[13px] text-ink-soft">No se encontraron proyectos con estos filtros.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Explore;
