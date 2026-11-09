import { useRef, useState, type ChangeEvent } from "react";
import { FileText, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, uploadFileRequest } from "../services/api";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Same plain-button style as ProjectDetail.tsx's "Guardar"/"Guardado" toggle
// (a toggle-ish action button on a normal paper background, not over an
// image like BannerUploader's BANNER_PILL_BUTTON).
const CV_BUTTON =
  "flex items-center gap-1.5 rounded-full bg-paper-raised border border-rule text-ink text-[13px] font-semibold py-2.5 px-5 cursor-pointer hover:bg-surface-ground disabled:opacity-60";

function CvUploader({
  cvUrl,
  onSave,
}: {
  cvUrl: string | null;
  onSave: (cvUrl: string | null) => Promise<unknown>;
}) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error("Solo se permiten archivos PDF o Word.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("El archivo supera el tamaño máximo permitido (10MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileRequest(token!, file);
      await onSave(result.url);
      toast.success("CV actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el CV."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await onSave(null);
      toast.success("CV actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el CV."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={CV_BUTTON}
      >
        <FileText size={15} weight="bold" />
        {uploading ? "Subiendo…" : cvUrl ? "Reemplazar CV" : "Subir CV"}
      </button>
      {cvUrl && (
        <button type="button" disabled={uploading} onClick={handleRemove} className={CV_BUTTON}>
          <Trash size={15} weight="bold" />
          Quitar CV
        </button>
      )}
    </>
  );
}

export default CvUploader;
