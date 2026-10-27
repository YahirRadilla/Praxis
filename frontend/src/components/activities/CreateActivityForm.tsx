import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X } from "@phosphor-icons/react";
import type { TeamMember } from "../../types/team";
import type { ActivityPriority, ActivityStatus } from "../../types/activity";
import { useCreateActivity } from "../../hooks/useActivities";
import { getErrorMessage } from "../../services/api";
import { ACTIVITY_STATUS, CARD_SHADOW, PRIMARY_BUTTON } from "../../utils/statusStyles";
import AssigneeSelect from "./AssigneeSelect";
import DatePicker from "../DatePicker";

interface CreateActivityFormProps {
  projectId: number;
  team: TeamMember[];
  initialStatus: ActivityStatus;
  onDone: () => void;
}

const PRIORITY_OPTIONS: ActivityPriority[] = ["BAJA", "MEDIA", "ALTA"];
const PRIORITY_LABELS: Record<ActivityPriority, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta" };

function CreateActivityForm({ projectId, team, initialStatus, onDone }: CreateActivityFormProps) {
  const createActivity = useCreateActivity(projectId);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<ActivityPriority>("MEDIA");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dueDate) {
      toast.error("La fecha límite es obligatoria.");
      return;
    }
    createActivity.mutate(
      {
        title,
        dueDate,
        priority,
        status: initialStatus,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Actividad creada");
          setTitle("");
          setDueDate(null);
          setPriority("MEDIA");
          setAssigneeIds([]);
          onDone();
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo crear la actividad.")),
      },
    );
  }

  const columnLabel = ACTIVITY_STATUS[initialStatus]?.label ?? initialStatus;

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-wrap items-end gap-2 bg-paper-raised border border-rule rounded-xl p-3 ${CARD_SHADOW}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[11.5px] font-semibold text-ink-faint uppercase">
          Nueva actividad en {columnLabel}
        </span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancelar"
          className="text-ink-faint hover:text-ink cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <input
        type="text"
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la actividad"
        className="flex-1 min-w-[200px] border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
      />
      <DatePicker value={dueDate} onChange={setDueDate} required aria-label="Fecha límite" className="text-[12.5px]" />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as ActivityPriority)}
        aria-label="Prioridad"
        className="border border-rule rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink"
      >
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <AssigneeSelect team={team} value={assigneeIds} onChange={setAssigneeIds} />
      <button
        type="submit"
        disabled={createActivity.isPending}
        className={`rounded-full text-[12px] font-bold px-4 py-2 cursor-pointer disabled:opacity-60 ${PRIMARY_BUTTON}`}
      >
        Agregar
      </button>
    </form>
  );
}

export default CreateActivityForm;
