import type { Evidence } from "../types/activity";

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
export const VIDEO_EXTENSIONS = [".mp4"];
export const PDF_EXTENSIONS = [".pdf"];

export function extensionOf(ev: Evidence): string {
  const source = ev.fileName ?? ev.url;
  const match = source.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export type EvidenceKind = "image" | "video" | "pdf" | "file" | "link";

export function getEvidenceKind(ev: Evidence): EvidenceKind {
  if (ev.type === "LINK") {
    return "link";
  }

  const ext = extensionOf(ev);

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return "video";
  }

  if (PDF_EXTENSIONS.includes(ext)) {
    return "pdf";
  }

  return "file";
}
