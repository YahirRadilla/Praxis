import { useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { UploadSimple } from "@phosphor-icons/react";

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

interface FileDropzoneProps {
  /** Same semantics as a native input's `accept` attribute. */
  accept?: string;
  /** Default false — single-file selection. */
  multiple?: boolean;
  disabled?: boolean;
  /** Small caption rendered below the dropzone copy, e.g. "Imágenes, video, PDF o Word · Máximo 10MB". */
  hint: string;
  /** Default 10MB — matches the backend multer limit. */
  maxSizeBytes?: number;
  onFilesSelected: (files: File[]) => void;
}

function FileDropzone({
  accept,
  multiple = false,
  disabled = false,
  hint,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  onFilesSelected,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  /** Shared validation path for both the native input's change and a drop:
   * rejects anything over `maxSizeBytes` (toast + skip), then — when
   * `multiple` is false — silently keeps only the first remaining file. */
  function processFiles(files: File[]) {
    const maxSizeMb = Math.round(maxSizeBytes / (1024 * 1024));
    const valid = files.filter((file) => {
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" supera el límite de ${maxSizeMb}MB.`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;
    const accepted = multiple ? valid : valid.slice(0, 1);
    onFilesSelected(accepted);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Reset so selecting the exact same file again still fires onChange.
    e.target.value = "";
    if (files.length === 0) return;
    processFiles(files);
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    processFiles(files);
  }

  return (
    <label
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-center transition-colors ${
        disabled
          ? "border-rule bg-paper opacity-60 pointer-events-none"
          : isDragging
            ? "border-accent-primary bg-accent-primary/5 cursor-pointer"
            : "border-rule bg-paper hover:border-accent-primary/60 cursor-pointer"
      }`}
    >
      <UploadSimple size={22} className="text-ink-faint" />
      <p className="text-[12.5px] text-ink-soft m-0">
        Arrastra tus archivos aquí, o{" "}
        <span className="text-accent-primary font-semibold underline">haz clic para buscar</span>
      </p>
      <p className="text-[11.5px] text-ink-faint m-0">{hint}</p>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}

export default FileDropzone;
