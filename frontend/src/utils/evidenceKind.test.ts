import { describe, expect, it } from "vitest";
import { getEvidenceKind } from "./evidenceKind";
import type { Evidence } from "../types/activity";

function fileEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 1,
    progressUpdateId: 1,
    type: "FILE",
    url: "https://cdn.example.com/evidence.jpg",
    fileName: "evidencia.jpg",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("getEvidenceKind", () => {
  it.each([".jpg", ".png", ".webp"])("returns \"image\" for %s files", (ext) => {
    const ev = fileEvidence({ fileName: `foto${ext}` });
    expect(getEvidenceKind(ev)).toBe("image");
  });

  it("returns \"video\" for .mp4 files", () => {
    const ev = fileEvidence({ fileName: "clip.mp4" });
    expect(getEvidenceKind(ev)).toBe("video");
  });

  it("returns \"pdf\" for .pdf files", () => {
    const ev = fileEvidence({ fileName: "reporte.pdf" });
    expect(getEvidenceKind(ev)).toBe("pdf");
  });

  it("returns \"file\" for an unrecognized extension", () => {
    const ev = fileEvidence({ fileName: "datos.csv" });
    expect(getEvidenceKind(ev)).toBe("file");
  });

  it("returns \"link\" for LINK evidence regardless of extension", () => {
    const ev = fileEvidence({ type: "LINK", fileName: "foto.jpg", url: "https://example.com/foto.jpg" });
    expect(getEvidenceKind(ev)).toBe("link");
  });

  it("matches extensions case-insensitively", () => {
    const ev = fileEvidence({ fileName: "FOTO.JPG" });
    expect(getEvidenceKind(ev)).toBe("image");
  });

  it("falls back to the URL when fileName is null", () => {
    const ev = fileEvidence({ fileName: null, url: "https://cdn.example.com/clip.mp4" });
    expect(getEvidenceKind(ev)).toBe("video");
  });
});
