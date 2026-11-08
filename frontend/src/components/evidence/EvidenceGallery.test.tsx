import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, within } from "../../test-utils";
import { EvidenceGallery } from "./EvidenceGallery";
import type { Evidence } from "../../types/activity";

function makeEvidence(overrides: Partial<Evidence>): Evidence {
  return {
    id: 1,
    progressUpdateId: 1,
    type: "FILE",
    url: "https://cdn.example.com/file",
    fileName: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const image1 = makeEvidence({ id: 1, url: "https://cdn.example.com/img1.jpg", fileName: "img1.jpg" });
const image2 = makeEvidence({ id: 2, url: "https://cdn.example.com/img2.jpg", fileName: "img2.jpg" });
const image3 = makeEvidence({ id: 3, url: "https://cdn.example.com/img3.jpg", fileName: "img3.jpg" });
const video = makeEvidence({ id: 4, url: "https://cdn.example.com/clip.mp4", fileName: "clip.mp4" });
const link = makeEvidence({ id: 5, type: "LINK", url: "https://example.com", fileName: "Enlace externo" });
const pdf = makeEvidence({ id: 6, url: "https://cdn.example.com/report.pdf", fileName: "report.pdf" });
const otherFile = makeEvidence({ id: 7, url: "https://cdn.example.com/notas.txt", fileName: "notas.txt" });

const evidence = [image1, image2, image3, video, link];
const evidenceWithPdf = [...evidence, pdf, otherFile];

describe("EvidenceGallery", () => {
  it("renders nothing when there is no evidence", () => {
    const { container } = renderWithProviders(<EvidenceGallery evidence={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders image evidence as buttons, not links", () => {
    renderWithProviders(<EvidenceGallery evidence={evidence} />);

    const imageButtons = screen.getAllByRole("button");
    expect(imageButtons).toHaveLength(3);

    const links = screen.getAllByRole("link");
    expect(links.every((l) => !l.getAttribute("href")?.match(/\.(jpg|png|webp)$/i))).toBe(true);
  });

  it("opens the lightbox showing the clicked image", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvidenceGallery evidence={evidence} />);

    const imageButtons = screen.getAllByRole("button");
    await user.click(imageButtons[1]); // img2.jpg

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("img2.jpg")).toBeInTheDocument();
  });

  it("moves to the next/prev image with wraparound", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvidenceGallery evidence={evidence} />);

    const imageButtons = screen.getAllByRole("button");
    await user.click(imageButtons[2]); // img3.jpg (last image)

    let dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("img3.jpg")).toBeInTheDocument();

    // Next from the last image wraps around to the first.
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("img1.jpg")).toBeInTheDocument();

    // Prev from the first image wraps back to the last.
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("img3.jpg")).toBeInTheDocument();
  });

  it("renders video evidence as a <video> element", () => {
    const { container } = renderWithProviders(<EvidenceGallery evidence={evidence} />);

    const videoEl = container.querySelector("video");
    expect(videoEl).not.toBeNull();
    expect(videoEl?.getAttribute("src")).toBe(video.url);
  });

  it("renders LINK evidence as an anchor opening in a new tab", () => {
    renderWithProviders(<EvidenceGallery evidence={evidence} />);

    const anchor = screen.getByRole("link", { name: "Enlace externo" });
    expect(anchor).toHaveAttribute("href", link.url);
    expect(anchor).toHaveAttribute("target", "_blank");
  });

  it("renders PDF evidence as a button, not an anchor", () => {
    renderWithProviders(<EvidenceGallery evidence={evidenceWithPdf} />);

    const pdfButton = screen.getByRole("button", { name: /report\.pdf/ });
    expect(pdfButton.tagName).toBe("BUTTON");

    const links = screen.getAllByRole("link");
    expect(links.every((l) => l.getAttribute("href") !== pdf.url)).toBe(true);
  });

  it("opens a dialog with an iframe pointing at the PDF url when the PDF chip is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvidenceGallery evidence={evidenceWithPdf} />);

    await user.click(screen.getByRole("button", { name: /report\.pdf/ }));

    const dialog = screen.getByRole("dialog");
    const iframe = within(dialog).getByTitle("report.pdf");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", pdf.url);

    const openInNewTab = within(dialog).getByRole("link", { name: "Abrir en pestaña nueva" });
    expect(openInNewTab).toHaveAttribute("href", pdf.url);
  });

  it("closes the PDF dialog when the close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvidenceGallery evidence={evidenceWithPdf} />);

    await user.click(screen.getByRole("button", { name: /report\.pdf/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps non-PDF files and links as anchors opening in a new tab (unchanged by this unit)", () => {
    renderWithProviders(<EvidenceGallery evidence={evidenceWithPdf} />);

    const fileAnchor = screen.getByRole("link", { name: /notas\.txt/ });
    expect(fileAnchor).toHaveAttribute("href", otherFile.url);
    expect(fileAnchor).toHaveAttribute("target", "_blank");

    const linkAnchor = screen.getByRole("link", { name: "Enlace externo" });
    expect(linkAnchor).toHaveAttribute("href", link.url);
    expect(linkAnchor).toHaveAttribute("target", "_blank");
  });
});
