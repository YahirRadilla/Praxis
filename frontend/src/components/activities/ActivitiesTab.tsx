import { useState } from "react";
import { Lateral, LateralCard } from "../LayoutPrimitives";
import type { Activity, ProgressUpdate } from "../../types/activity";
import type { TeamMember } from "../../types/team";
import type { ProjectStatus } from "../../types/project";
import ActivityBoard from "./ActivityBoard";
import ActivityTable from "./ActivityTable";
import Skeleton from "../Skeleton";

const SKELETON_COLUMN_COUNT = 4;

function BoardColumnSkeleton() {
  return (
    <div className="bg-surface-ground rounded-2xl p-2.5 flex flex-col gap-2 min-w-[272px]">
      <div className="flex items-center gap-2 px-1 py-1">
        <Skeleton height={14} width={64} shape="text" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="bg-paper-raised border border-rule rounded-xl p-3 flex flex-col gap-2.5">
            <Skeleton height={13} width="75%" shape="text" />
            <Skeleton height={11} width="40%" shape="text" />
            <div className="flex items-center justify-between">
              <Skeleton height={20} width={20} shape="circle" />
              <Skeleton height={11} width={28} shape="text" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ActivitiesView = "board" | "table";
const VIEW_STORAGE_KEY = "praxis.activitiesView";

function readStoredView(): ActivitiesView {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "table" ? "table" : "board";
  } catch {
    return "board";
  }
}

interface ActivitiesTabProps {
  projectId: number;
  activities: Activity[] | undefined;
  team: TeamMember[] | undefined;
  progressUpdates: ProgressUpdate[] | undefined;
  isMember: boolean;
  doneCount: number;
  projectStatus: ProjectStatus;
  isProjectOwner: boolean;
}

function ActivitiesTab({
  projectId,
  activities,
  team,
  isMember,
  projectStatus,
  isProjectOwner,
}: ActivitiesTabProps) {
  // TO_VALIDATE counts as not-done; recomputed fresh here instead of trusting
  // the `doneCount` prop, which predates the TO_VALIDATE status.
  const done = activities?.filter((a) => a.status === "DONE").length ?? 0;
  const total = activities?.length ?? 0;
  const readOnly = !isMember || projectStatus === "ARCHIVED";
  const [view, setView] = useState<ActivitiesView>(readStoredView);

  function handleViewChange(next: ActivitiesView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Private/blocked storage: the choice just won't persist across visits.
    }
  }

  // `activities` is still undefined while its own query is in flight (the
  // page only waits on `project` before rendering this tab), so show a
  // loading state here instead of defaulting to [] and flashing a false
  // "no activities" empty state.
  if (activities === undefined) {
    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <Skeleton height={28} width={140} shape="circle" />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: SKELETON_COLUMN_COUNT }).map((_, i) => (
              <BoardColumnSkeleton key={i} />
            ))}
          </div>
        </div>
        <Lateral>
          <LateralCard title="Progreso del semestre">
            <div className="flex items-center justify-between">
              <Skeleton height={14} width={110} shape="text" />
              <Skeleton height={14} width={32} shape="text" />
            </div>
            <Skeleton height={8} shape="circle" />
          </LateralCard>
        </Lateral>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex gap-1 self-start rounded-full bg-surface-ground p-1">
          <button
            type="button"
            onClick={() => handleViewChange("board")}
            className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
              view === "board" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            Tablero
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("table")}
            className={`rounded-full text-[11.5px] font-semibold py-1 px-3 cursor-pointer ${
              view === "table" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            Tabla
          </button>
        </div>

        {view === "board" ? (
          <ActivityBoard
            projectId={projectId}
            activities={activities ?? []}
            team={team ?? []}
            isProjectOwner={isProjectOwner}
            readOnly={readOnly}
          />
        ) : (
          <ActivityTable
            projectId={projectId}
            activities={activities ?? []}
            isProjectOwner={isProjectOwner}
            readOnly={readOnly}
          />
        )}
      </div>
      <Lateral>
        <LateralCard title="Progreso del semestre">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-ink-soft m-0">
              {done} de {total} actividades
            </p>
            <span className="text-[12.5px] font-bold text-accent-primary">
              {total ? Math.round((done / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-ground overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </LateralCard>
      </Lateral>
    </>
  );
}

export default ActivitiesTab;
