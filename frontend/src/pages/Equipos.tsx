import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SidebarNav from "../components/feed/SidebarNav";
import TeamMemberRow from "../components/team/TeamMemberRow";
import { useMyProjects } from "../hooks/useProjects";
import { useTeam } from "../hooks/useTeam";
import type { Project } from "../types/project";
import { CARD_SHADOW } from "../utils/statusStyles";

function ProjectTeamSection({ project }: { project: Project }) {
  const { data: team } = useTeam(project.id);

  return (
    <div className="flex flex-col gap-2">
      <Link to={`/proyectos/${project.id}`} className="font-heading text-[15px] font-bold text-ink hover:underline">
        {project.name}
      </Link>
      <div className={`bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW}`}>
        {team?.map((member) => <TeamMemberRow key={member.id} member={member} />)}
        {team?.length === 0 && <p className="text-[13px] text-ink-soft p-4 m-0">Todavía sin integrantes.</p>}
      </div>
    </div>
  );
}

function Equipos() {
  const { data: projects, isLoading } = useMyProjects();

  return (
    <div className="min-h-dvh flex flex-col bg-surface-ground">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-7 items-stretch md:items-start max-w-[1200px] mx-auto w-full">
        <aside className="w-full md:w-[240px] md:shrink-0">
          <SidebarNav />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-6">
          <h1 className="font-heading text-[22px] font-bold text-ink m-0">Equipos</h1>

          {isLoading && <p className="text-[13px] text-ink-soft">Cargando…</p>}
          {!isLoading && projects?.length === 0 && (
            <p className="text-[13px] text-ink-soft">Todavía no participas en ningún proyecto.</p>
          )}

          {projects?.map((project) => (
            <ProjectTeamSection key={project.id} project={project} />
          ))}
        </section>
      </div>
    </div>
  );
}

export default Equipos;
