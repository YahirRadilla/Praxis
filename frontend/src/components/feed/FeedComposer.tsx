import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { FilePdf, Paperclip, X } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useMyProjects } from "../../hooks/useProjects";
import { useCreateFeedPost, useUploadFile } from "../../hooks/useProgressUpdates";
import { getErrorMessage } from "../../services/api";
import { CARD_SHADOW, PRIMARY_BUTTON } from "../../utils/statusStyles";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_POST = 6;
const MAX_PDFS_PER_POST = 1;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

type ComposerAttachment = {
  localId: string;
  file: File;
  status: "uploading" | "done" | "error";
  result?: { url: string; fileName: string; mimeType: string };
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

let localIdSeq = 0;
function nextLocalId(): string {
  localIdSeq += 1;
  return `composer-attachment-${localIdSeq}`;
}

function FeedComposer() {
  const { user } = useAuth();
  const { data: myProjects } = useMyProjects();
  // Only projects the viewer can actually post to (accepted member, not
  // archived) — WU-09. An evaluator or a pending-invite project shouldn't
  // show up here even though `useMyProjects` includes it.
  const postableProjects = myProjects?.filter((p) => p.viewer?.canPost);
  const createFeedPost = useCreateFeedPost();
  const uploadFile = useUploadFile();

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | "">("");
  const [text, setText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Caches one object URL per image attachment so the thumbnail doesn't get
  // re-created (and its previous URL leaked) on every re-render — revoked
  // explicitly when that attachment is removed, and on unmount below.
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  function getObjectUrl(attachment: ComposerAttachment): string {
    const cached = objectUrlsRef.current.get(attachment.localId);
    if (cached) return cached;
    const url = URL.createObjectURL(attachment.file);
    objectUrlsRef.current.set(attachment.localId, url);
    return url;
  }

  function revokeObjectUrl(localId: string) {
    const url = objectUrlsRef.current.get(localId);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(localId);
    }
  }

  function uploadAttachment(localId: string, file: File) {
    uploadFile.mutateAsync(file).then(
      (result) => {
        setAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "done", result } : a)),
        );
      },
      (error) => {
        setAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "error" } : a)),
        );
        toast.error(getErrorMessage(error, `No se pudo subir "${file.name}".`));
      },
    );
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    let imageCount = attachments.filter((a) => isImageFile(a.file)).length;
    let pdfCount = attachments.filter((a) => isPdfFile(a.file)).length;
    const accepted: ComposerAttachment[] = [];

    for (const file of files) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es un tipo de archivo permitido.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" supera el límite de 10 MB.`);
        continue;
      }
      if (isImageFile(file)) {
        if (imageCount >= MAX_IMAGES_PER_POST) {
          toast.error("Solo puedes adjuntar hasta 6 imágenes por publicación.");
          continue;
        }
        imageCount += 1;
      } else if (isPdfFile(file)) {
        if (pdfCount >= MAX_PDFS_PER_POST) {
          toast.error("Solo puedes adjuntar un PDF por publicación.");
          continue;
        }
        pdfCount += 1;
      }
      accepted.push({ localId: nextLocalId(), file, status: "uploading" });
    }

    if (accepted.length === 0) return;

    setAttachments((prev) => [...prev, ...accepted]);
    accepted.forEach((a) => uploadAttachment(a.localId, a.file));
  }

  function removeAttachment(localId: string) {
    revokeObjectUrl(localId);
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }

  function retryAttachment(localId: string) {
    const attachment = attachments.find((a) => a.localId === localId);
    if (!attachment) return;
    setAttachments((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, status: "uploading" } : a)),
    );
    uploadAttachment(localId, attachment.file);
  }

  function clearAttachments() {
    attachments.forEach((a) => revokeObjectUrl(a.localId));
    setAttachments([]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId) {
      toast.error("Elige a qué proyecto pertenece este avance.");
      return;
    }

    const fileEvidence = attachments
      .filter((a): a is ComposerAttachment & { result: NonNullable<ComposerAttachment["result"]> } =>
        a.status === "done" && !!a.result,
      )
      .map((a) => ({ type: "FILE" as const, url: a.result.url, fileName: a.result.fileName }));
    const linkEvidence = evidenceUrl ? [{ type: "LINK" as const, url: evidenceUrl }] : [];
    const evidence = [...fileEvidence, ...linkEvidence];

    createFeedPost.mutate(
      {
        projectId,
        text,
        evidence: evidence.length > 0 ? evidence : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Avance publicado");
          setText("");
          setEvidenceUrl("");
          clearAttachments();
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "No se pudo publicar el avance.")),
      },
    );
  }

  function handleCancel() {
    clearAttachments();
    setOpen(false);
  }

  const hasUploadingAttachment = attachments.some((a) => a.status === "uploading");

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
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.localId}
                  className={`relative flex items-center gap-1.5 border rounded-lg p-1.5 ${
                    a.status === "error" ? "border-red-400 bg-red-50" : "border-rule bg-paper"
                  }`}
                >
                  {isImageFile(a.file) ? (
                    <img
                      src={getObjectUrl(a)}
                      alt={a.file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="flex items-center gap-1 pr-5">
                      <FilePdf size={16} className="text-ink-faint shrink-0" />
                      <span className="text-[11px] text-ink-soft truncate max-w-[110px]">
                        {a.file.name}
                      </span>
                    </div>
                  )}
                  {a.status === "uploading" && (
                    <span
                      role="status"
                      aria-label={`Subiendo ${a.file.name}`}
                      className="text-[10px] text-ink-faint px-1"
                    >
                      Subiendo…
                    </span>
                  )}
                  {a.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retryAttachment(a.localId)}
                      className="text-[10px] font-semibold text-red-600 underline px-1"
                    >
                      Reintentar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.localId)}
                    aria-label={`Quitar ${a.file.name}`}
                    className="absolute -top-1.5 -right-1.5 bg-paper border border-rule rounded-full p-0.5 leading-none"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="Enlace a evidencia (opcional)"
            className="border border-rule rounded-lg bg-paper px-3 py-2.5 text-[12.5px] text-ink"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-accent-primary"
            >
              <Paperclip size={14} /> Adjuntar archivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              aria-label="Adjuntar archivos"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="text-[12.5px] text-ink-soft py-2 px-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createFeedPost.isPending || hasUploadingAttachment}
                className={`rounded-full text-[12.5px] font-bold py-2 px-5 disabled:opacity-60 ${PRIMARY_BUTTON}`}
              >
                {createFeedPost.isPending ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default FeedComposer;
