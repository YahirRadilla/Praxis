import type { ReactNode } from "react";
import type { Project } from "../types/project";
import { getChipTextColor } from "../utils/chipTextColor";

function ProjectHeaderBand({ project, actions }: { project: Project; actions?: ReactNode }) {
  const mainSdg = project.sdgs[0]?.sdg;
  const mainCategory = project.categories?.[0]?.category;
  const bandColor = mainCategory?.colorHex ?? mainSdg?.colorHex ?? "#19486A";

  return (
    <div className="px-8 pt-6">
      <div
        style={{ background: `linear-gradient(135deg, ${bandColor}, ${bandColor}CC)` }}
        className="relative rounded-2xl overflow-hidden min-h-[260px] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_20px_44px_-20px_rgba(20,22,26,0.35)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,12,10,0.82),rgba(10,12,10,0)_60%)]" />

        <div className="relative z-10 flex flex-col min-h-[260px] p-6 gap-4">
          {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}

          <div className="flex-1 flex flex-col gap-2.5 justify-end">
            <div className="flex items-center gap-2 flex-wrap">
              {project.categories.length > 0
                ? project.categories.map(({ category }) => (
                    <span
                      key={category.id}
                      style={{ backgroundColor: category.colorHex, color: getChipTextColor(category.colorHex) }}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold font-data shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                    >
                      {category.name}
                    </span>
                  ))
                : project.sdgs.map(({ sdg }) => (
                    <span
                      key={sdg.id}
                      style={{ backgroundColor: sdg.colorHex, color: getChipTextColor(sdg.colorHex) }}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold font-data shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                    >
                      ODS {String(sdg.id).padStart(2, "0")} · {sdg.name}
                    </span>
                  ))}
            </div>
            <h1 className="font-heading text-[30px] font-bold text-white m-0 leading-tight drop-shadow-sm">
              {project.name}
            </h1>
            <p className="text-white/90 text-[14px] leading-relaxed max-w-[640px] m-0 line-clamp-3">
              {project.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectHeaderBand;
