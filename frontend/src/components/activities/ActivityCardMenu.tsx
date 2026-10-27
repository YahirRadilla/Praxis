import { useState } from "react";
import { toast } from "sonner";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { DotsThreeVertical, Trash } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useDeleteActivity, useMoveActivity } from "../../hooks/useActivities";
import { getErrorMessage } from "../../services/api";
import { ACTIVITY_STATUS } from "../../utils/statusStyles";
import type { Activity, ActivityStatus } from "../../types/activity";
import ConfirmDialog from "../ConfirmDialog";

const MOVE_TARGETS: ActivityStatus[] = ["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"];

interface ActivityCardMenuProps {
  projectId: number;
  activity: Activity;
  isProjectOwner: boolean;
  onMoved: () => void;
}

function ActivityCardMenu({ projectId, activity, isProjectOwner, onMoved }: ActivityCardMenuProps) {
  const { user } = useAuth();
  const moveActivity = useMoveActivity(projectId);
  const deleteActivity = useDeleteActivity(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDelete = isProjectOwner || activity.ownerId === user?.id;

  function handleMove(status: ActivityStatus) {
    if (status === activity.status) return;
    // Non-drag fallback: always lands at the top of the destination column.
    moveActivity.move(activity.id, status, 0, {
      onSuccess: () => onMoved(),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo mover la actividad.")),
    });
  }

  function handleConfirmDelete() {
    deleteActivity.mutate(activity.id, {
      onSuccess: () => toast.success("Actividad eliminada"),
      onError: (error) => toast.error(getErrorMessage(error, "No se pudo eliminar la actividad.")),
    });
    setConfirmOpen(false);
  }

  return (
    <Menu as="div" className="relative" onClick={(e) => e.stopPropagation()}>
      <MenuButton
        className="w-6 h-6 flex items-center justify-center rounded-full text-ink-faint hover:bg-surface-ground hover:text-ink cursor-pointer"
        aria-label="Opciones de la actividad"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-50 w-[200px] bg-paper-raised border border-rule rounded-xl py-1.5 shadow-[0_1px_2px_rgba(20,22,26,0.04),0_10px_28px_-14px_rgba(20,22,26,0.18)] focus:outline-none"
      >
        <div className="px-3 py-1.5 text-[10.5px] font-semibold text-ink-faint uppercase">Mover a</div>
        {MOVE_TARGETS.map((status) => (
          <MenuItem key={status} disabled={status === activity.status}>
            <button
              type="button"
              onClick={() => handleMove(status)}
              disabled={status === activity.status}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-left cursor-pointer disabled:opacity-40 disabled:cursor-default data-[focus]:bg-surface-ground"
            >
              <span
                style={{ backgroundColor: ACTIVITY_STATUS[status].fg }}
                className="w-1.5 h-1.5 rounded-full shrink-0"
              />
              {ACTIVITY_STATUS[status].label}
            </button>
          </MenuItem>
        ))}
        {canDelete && (
          <>
            <div className="my-1 border-t border-rule" />
            <MenuItem>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-left cursor-pointer data-[focus]:bg-surface-ground"
                style={{ color: "#A21942" }}
              >
                <Trash size={14} />
                Borrar
              </button>
            </MenuItem>
          </>
        )}
      </MenuItems>
      <ConfirmDialog
        open={confirmOpen}
        danger
        title="¿Borrar esta actividad?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </Menu>
  );
}

export default ActivityCardMenu;
