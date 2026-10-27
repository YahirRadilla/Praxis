import { Link } from "react-router-dom";
import type { Project } from "../types/project";
import StatusPill from "./StatusPill";
import { CARD_SHADOW, PROJECT_STATUS } from "../utils/statusStyles";

function ProjectRow({ project }: { project: Project }) {
  const mainSdg = project.sdgs[0]?.sdg;
  const mainCategory = project.categories?.[0]?.category;
  const bandColor = mainSdg?.colorHex ?? mainCategory?.colorHex;

  return (
    <Link
      to={`/proyectos/${project.id}`}
      className={`flex bg-paper-raised border border-rule rounded-xl overflow-hidden ${CARD_SHADOW} hover:shadow-[0_1px_2px_rgba(20,22,26,0.04),0_16px_36px_-14px_rgba(20,22,26,0.28)] hover:-translate-y-0.5`}
    >
      <div
        style={{ background: bandColor ? `linear-gradient(160deg, ${bandColor}, ${bandColor}99)` : "#19486A" }}
        className="w-[120px] shrink-0 flex items-end p-2.5"
      >
        {mainSdg ? (
          <span style={{ backgroundColor: mainSdg.colorHex }} className="rounded-full px-2.5 py-1.5 text-[10px] font-bold font-data text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            ODS {String(mainSdg.id).padStart(2, "0")}
          </span>
        ) : (
          mainCategory && (
            <span style={{ backgroundColor: mainCategory.colorHex }} className="rounded-full px-2.5 py-1.5 text-[10px] font-bold font-data text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              {mainCategory.name}
            </span>
          )
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2 py-5 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold font-data text-ink-faint truncate">
            {project.sdgs.length > 0
              ? `ODS ${project.sdgs.map(({ sdg }) => sdg.id).join(", ")}`
              : project.categories.map(({ category }) => category.name).join(", ")}
          </span>
          <StatusPill status={PROJECT_STATUS[project.status] ?? PROJECT_STATUS.DRAFT} className="shrink-0" />
        </div>
        <h3 className="font-heading text-[17px] font-semibold text-ink m-0 leading-snug">{project.name}</h3>
        <p className="text-[13px] text-ink-soft m-0 line-clamp-2">{project.description}</p>
        <div className="flex items-center gap-4 mt-0.5">
          <span className="text-[12.5px] text-ink-soft">{project.owner.name}</span>
        </div>
      </div>
    </Link>
  );
}

export default ProjectRow;
