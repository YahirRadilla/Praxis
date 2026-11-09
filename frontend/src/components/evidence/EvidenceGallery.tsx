import { useState } from "react";
import { FilePdf, FileText } from "@phosphor-icons/react";
import type { Evidence } from "../../types/activity";
import { getEvidenceKind } from "../../utils/evidenceKind";
import ImageLightbox from "./ImageLightbox";
import PdfViewerDialog from "./PdfViewerDialog";

function FileChip({ ev }: { ev: Evidence }) {
  if (ev.type === "LINK") {
    return (
      <a
        href={ev.url}
        target="_blank"
        rel="noreferrer"
        className="bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
      >
        {ev.fileName ?? ev.url}
      </a>
    );
  }

  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
    >
      <FileText size={14} />
      {ev.fileName ?? ev.url}
    </a>
  );
}

function PdfChip({ ev, onOpen }: { ev: Evidence; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-1.5 bg-paper border border-rule rounded-lg px-3 py-2 font-data text-[11.5px] text-ink-soft"
    >
      <FilePdf size={14} />
      {ev.fileName ?? ev.url}
    </button>
  );
}

export function EvidenceGallery({ evidence }: { evidence: Evidence[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pdfViewerTarget, setPdfViewerTarget] = useState<Evidence | null>(null);

  if (evidence.length === 0) return null;

  const images: Evidence[] = [];
  const videos: Evidence[] = [];
  const pdfs: Evidence[] = [];
  const others: Evidence[] = [];

  for (const ev of evidence) {
    const kind = getEvidenceKind(ev);
    if (kind === "image") {
      images.push(ev);
    } else if (kind === "video") {
      videos.push(ev);
    } else if (kind === "pdf") {
      pdfs.push(ev);
    } else {
      // "file" and "link" render as the same chip in this unit.
      others.push(ev);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scroll-thin snap-x snap-mandatory">
          {images.map((ev, i) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="shrink-0 cursor-pointer"
            >
              <img
                src={ev.url}
                alt={ev.fileName ?? "Evidencia"}
                className={
                  images.length === 1
                    ? "max-h-80 w-full object-cover rounded-lg border border-rule"
                    : "h-40 w-auto max-w-[240px] object-cover rounded-lg border border-rule snap-start"
                }
              />
            </button>
          ))}
        </div>
      )}

      {(videos.length > 0 || pdfs.length > 0 || others.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {videos.map((ev) => (
            <video key={ev.id} controls src={ev.url} className="max-w-[260px] rounded-lg border border-rule">
              Tu navegador no soporta la reproducción de video.
            </video>
          ))}
          {pdfs.map((ev) => (
            <PdfChip key={ev.id} ev={ev} onOpen={() => setPdfViewerTarget(ev)} />
          ))}
          {others.map((ev) => (
            <FileChip key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <PdfViewerDialog pdf={pdfViewerTarget} onClose={() => setPdfViewerTarget(null)} />
    </div>
  );
}
