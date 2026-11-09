import { useRef, useState, type ChangeEvent } from "react";
import { Image, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, uploadFileRequest } from "../services/api";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Pill styling tuned to sit on top of a dark/colored banner background —
// PRIMARY_BUTTON (statusStyles.ts) assumes a light paper background, so it
// doesn't fit here.
export const BANNER_PILL_BUTTON =
  "flex items-center gap-1.5 rounded-full text-[12.5px] font-bold py-2 px-4 cursor-pointer bg-black/45 text-white border border-white/30 backdrop-blur-sm hover:bg-black/60 disabled:opacity-60";

function BannerUploader({
  hasBanner,
  onSave,
}: {
  hasBanner: boolean;
  onSave: (bannerUrl: string | null) => Promise<unknown>;
}) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG, WEBP o GIF.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("La imagen supera el tamaño máximo permitido (10MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileRequest(token!, file);
      await onSave(result.url);
      toast.success("Banner actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el banner."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await onSave(null);
      toast.success("Banner actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el banner."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={BANNER_PILL_BUTTON}
      >
        <Image size={15} weight="bold" />
        {uploading ? "Subiendo…" : "Cambiar banner"}
      </button>
      {hasBanner && (
        <button type="button" disabled={uploading} onClick={handleRemove} className={BANNER_PILL_BUTTON}>
          <Trash size={15} weight="bold" />
          Quitar imagen
        </button>
      )}
    </>
  );
}

export default BannerUploader;
