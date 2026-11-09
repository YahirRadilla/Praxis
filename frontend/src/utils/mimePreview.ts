import type { Evidence } from "../types/activity";

export function isPreviewableImage(mimeType: string | null | undefined): boolean {
  return !!mimeType && mimeType.startsWith("image/");
}

export function isPreviewablePdf(mimeType: string | null | undefined): boolean {
  return mimeType === "application/pdf";
}

/** Adapts a FILE-typed item that isn't Evidence-shaped (ActivityAttachment,
 * ProjectResource, ClassGroupResource — all carry id/url/fileName/mimeType
 * but not progressUpdateId) so it can be fed into ImageLightbox/
 * PdfViewerDialog, which only read `url`/`fileName`. Mirrors
 * AttachmentPreviewGrid's `toSyntheticEvidence`. */
export function toPreviewEvidence(item: { id: number; url: string; fileName: string | null }): Evidence {
  return {
    id: item.id,
    progressUpdateId: 0,
    type: "FILE",
    url: item.url,
    fileName: item.fileName,
    createdAt: new Date().toISOString(),
  };
}
