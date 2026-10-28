import Navbar from "../components/Navbar";
import SidebarNav from "../components/feed/SidebarNav";
import ProjectRow from "../components/ProjectRow";
import { useMyProjects } from "../hooks/useProjects";

function MisProyectos() {
  const { data: projects, isLoading } = useMyProjects();

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-full md:w-[240px] md:shrink-0">
          <SidebarNav />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <h1 className="font-heading text-[22px] font-bold text-ink m-0">Mis proyectos</h1>

          {isLoading && <p className="text-[13px] text-ink-soft">Cargando…</p>}
          {!isLoading && projects?.length === 0 && (
            <p className="text-[13px] text-ink-soft">Todavía no participas en ningún proyecto.</p>
          )}

          <div className="flex flex-col gap-3">
            {projects?.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default MisProyectos;
