import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useMyProjects } from "../../hooks/useProjects";
import { useCreateFeedPost } from "../../hooks/useProgressUpdates";
import { getErrorMessage } from "../../services/api";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../../utils/statusStyles";

function FeedComposer() {
  const { user } = useAuth();
  const { data: myProjects } = useMyProjects();
  // Only projects the viewer can actually post to (accepted member, not
  // archived) — WU-09. An evaluator or a pending-invite project shouldn't
  // show up here even though `useMyProjects` includes it.
  const postableProjects = myProjects?.filter((p) => p.viewer?.canPost);
  const createFeedPost = useCreateFeedPost();

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | "">("");
  const [text, setText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId) {
      toast.error("Elige a qué proyecto pertenece este avance.");
      return;
    }
    createFeedPost.mutate(
      {
        projectId,
        text,
        evidence: evidenceUrl ? [{ type: "LINK", url: evidenceUrl }] : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Avance publicado");
          setText("");
          setEvidenceUrl("");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar el avance.")),
      },
    );
  }

  if (!user) return null;

  return (
    <div className={`bg-paper-raised border border-rule rounded-xl p-4 ${CARD_SHADOW}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left rounded-full border border-rule bg-paper px-4 py-2.5 text-[13px] text-ink-faint hover:bg-surface-ground hover:border-ink-faint"
        >
          Comparte un avance de tu proyecto
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
            className="border border-rule rounded-lg bg-paper px-3 py-2.5 text-[12.5px] text-ink"
          >
            <option value="">Elige un proyecto…</option>
            {postableProjects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué avanzaste?"
            className="border border-rule rounded-lg bg-paper px-3 py-2.5 text-[13px] text-ink resize-none"
          />
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="Enlace a evidencia (opcional)"
            className="border border-rule rounded-lg bg-paper px-3 py-2.5 text-[12.5px] text-ink"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12.5px] text-ink-soft py-2 px-3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createFeedPost.isPending}
              className={`rounded-full text-[12.5px] font-bold py-2 px-5 disabled:opacity-60 ${PRIMARY_BUTTON}`}
            >
              {createFeedPost.isPending ? "Publicando…" : "Publicar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default FeedComposer;
