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

const evidence = [image1, image2, image3, video, link];

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
});
