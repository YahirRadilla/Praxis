import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, CircleNotch, FileDoc, FilePdf, FileText, X } from "@phosphor-icons/react";
import type { Evidence } from "../../types/activity";
import ImageLightbox from "./ImageLightbox";
import PdfViewerDialog from "./PdfViewerDialog";

export type PendingAttachmentStatus = "uploading" | "done" | "error";

/** Minimal shape this grid needs — both `ProjectDetail.tsx`'s
 * `EvidenceAttachment` and `FeedComposer.tsx`'s `ComposerAttachment` already
 * satisfy this structurally, so neither call site needs to map its local
 * attachment array into a different shape. */
export interface PendingAttachment {
  localId: string;
  file: File;
  status: PendingAttachmentStatus;
}

interface AttachmentPreviewGridProps {
  attachments: PendingAttachment[];
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isDocFile(file: File): boolean {
  return /\.(doc|docx)$/i.test(file.name);
}

function FileTypeIcon({ file }: { file: File }) {
  if (isPdfFile(file)) return <FilePdf size={26} className="text-ink-faint" />;
  if (isDocFile(file)) return <FileDoc size={26} className="text-ink-faint" />;
  return <FileText size={26} className="text-ink-faint" />;
}

function toSyntheticEvidence(attachment: PendingAttachment, url: string): Evidence {
  return {
    id: 0,
    progressUpdateId: 0,
    type: "FILE",
    url,
    fileName: attachment.file.name,
    createdAt: new Date().toISOString(),
  };
}

function AttachmentPreviewGrid({ attachments, onRemove, onRetry }: AttachmentPreviewGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pdfPreview, setPdfPreview] = useState<Evidence | null>(null);
  // Owns the object-URL lifecycle for every attachment it's handed — one
  // local file URL per localId, created once and revoked when that
  // attachment leaves the incoming list or the component unmounts.
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const currentIds = new Set(attachments.map((a) => a.localId));
    objectUrlsRef.current.forEach((url, localId) => {
      if (!currentIds.has(localId)) {
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(localId);
      }
    });
  }, [attachments]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  if (attachments.length === 0) return null;

  function getObjectUrl(attachment: PendingAttachment): string {
    const cached = objectUrlsRef.current.get(attachment.localId);
    if (cached) return cached;
    const url = URL.createObjectURL(attachment.file);
    objectUrlsRef.current.set(attachment.localId, url);
    return url;
  }

  const imageAttachments = attachments.filter((a) => isImageFile(a.file));

  function handleCardClick(attachment: PendingAttachment) {
    if (attachment.status !== "done") return;
    if (isImageFile(attachment.file)) {
      const index = imageAttachments.findIndex((a) => a.localId === attachment.localId);
      if (index >= 0) setLightboxIndex(index);
    } else if (isPdfFile(attachment.file)) {
      setPdfPreview(toSyntheticEvidence(attachment, getObjectUrl(attachment)));
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => {
          const previewable = isImageFile(attachment.file) || isPdfFile(attachment.file);
          const clickable = attachment.status === "done" && previewable;

          return (
            <div
              key={attachment.localId}
              onClick={clickable ? () => handleCardClick(attachment) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(attachment);
                      }
                    }
                  : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `Ver vista previa de ${attachment.file.name}` : undefined}
              className={`relative w-20 h-20 shrink-0 rounded-lg border bg-paper overflow-hidden ${
                attachment.status === "error" ? "border-red-400" : "border-rule"
              } ${clickable ? "cursor-pointer" : ""}`}
            >
              {isImageFile(attachment.file) ? (
                <>
                  <img
                    src={getObjectUrl(attachment)}
                    alt={attachment.file.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-ink/60 text-white text-[9px] leading-tight px-1 py-0.5 truncate">
                    {attachment.file.name}
                  </span>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1.5">
                  <FileTypeIcon file={attachment.file} />
                  <span className="w-full text-[9px] text-ink-faint text-center leading-tight truncate">
                    {attachment.file.name}
                  </span>
                </div>
              )}

              {attachment.status === "uploading" && (
                <div
                  role="status"
                  aria-label={`Subiendo ${attachment.file.name}`}
                  className="absolute inset-0 bg-ink/50 flex items-center justify-center"
                >
                  <CircleNotch size={20} className="text-white animate-spin" />
                </div>
              )}

              {attachment.status === "error" && (
                <div className="absolute inset-0 bg-red-600/55 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(attachment.localId);
                    }}
                    aria-label={`Reintentar subir ${attachment.file.name}`}
                    className="text-white hover:text-white/80 cursor-pointer"
                  >
                    <ArrowClockwise size={18} weight="bold" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(attachment.localId);
                }}
                aria-label={`Quitar ${attachment.file.name}`}
                className="absolute top-0.5 right-0.5 bg-ink/60 hover:bg-ink/80 text-white rounded-full p-0.5 leading-none cursor-pointer"
              >
                <X size={10} weight="bold" />
              </button>
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={imageAttachments.map((a) => toSyntheticEvidence(a, getObjectUrl(a)))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <PdfViewerDialog pdf={pdfPreview} onClose={() => setPdfPreview(null)} />
    </>
  );
}

export default AttachmentPreviewGrid;
