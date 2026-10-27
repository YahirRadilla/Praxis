import { Link } from "react-router-dom";
import type { Project } from "../types/project";
import StatusPill from "./StatusPill";
import AvatarStack from "./AvatarStack";
import { useTeam } from "../hooks/useTeam";
import { CARD_SHADOW, PROJECT_STATUS } from "../utils/statusStyles";

function ProjectCard({ project }: { project: Project }) {
  const mainSdg = project.sdgs[0]?.sdg;
  const mainCategory = project.categories?.[0]?.category;
  const bandColor = mainSdg?.colorHex ?? mainCategory?.colorHex;
  const { data: team } = useTeam(project.id);

  return (
    <Link
      to={`/proyectos/${project.id}`}
      className={`flex flex-col bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW} hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_18px_40px_-16px_rgba(20,22,26,0.3)] hover:-translate-y-0.5`}
    >
      <div
        style={{ background: bandColor ? `linear-gradient(150deg, ${bandColor}, ${bandColor}99)` : "#19486A" }}
        className="relative h-[130px] flex items-start p-2.5"
      >
        {mainSdg ? (
          <span
            style={{ backgroundColor: mainSdg.colorHex }}
            className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white font-data shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          >
            ODS {String(mainSdg.id).padStart(2, "0")} · {mainSdg.name}
          </span>
        ) : (
          mainCategory && (
            <span
              style={{ backgroundColor: mainCategory.colorHex }}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white font-data shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
            >
              {mainCategory.name}
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-heading text-[15.5px] font-semibold text-ink m-0 leading-snug">{project.name}</h3>
        <p className="text-[12.5px] text-ink-soft m-0 line-clamp-2 min-h-[32px]">{project.description}</p>

        <div className="flex items-center justify-between mt-1">
          <AvatarStack people={team ?? []} size="sm" max={3} />
          <StatusPill status={PROJECT_STATUS[project.status] ?? PROJECT_STATUS.DRAFT} />
        </div>
      </div>
    </Link>
  );
}

export default ProjectCard;
