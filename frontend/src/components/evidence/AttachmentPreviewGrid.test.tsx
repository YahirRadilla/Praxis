import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import AttachmentPreviewGrid, { type PendingAttachment } from "./AttachmentPreviewGrid";

function makeAttachment(
  localId: string,
  fileName: string,
  status: PendingAttachment["status"],
  type = "image/png",
): PendingAttachment {
  return { localId, file: new File([new Uint8Array(4)], fileName, { type }), status };
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

describe("AttachmentPreviewGrid", () => {
  it("renders nothing when there are no attachments", () => {
    const { container } = render(
      <AttachmentPreviewGrid attachments={[]} onRemove={vi.fn()} onRetry={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one card per attachment", () => {
    render(
      <AttachmentPreviewGrid
        attachments={[
          makeAttachment("a", "img1.png", "done"),
          makeAttachment("b", "img2.png", "uploading"),
        ]}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByAltText("img1.png")).toBeInTheDocument();
    expect(screen.getByAltText("img2.png")).toBeInTheDocument();
  });

  it("shows a loading state for an uploading attachment", () => {
    render(
      <AttachmentPreviewGrid
        attachments={[makeAttachment("a", "img1.png", "uploading")]}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("status", { name: "Subiendo img1.png" })).toBeInTheDocument();
  });

  it("opens the lightbox on a done image attachment and shows that image", async () => {
    const user = userEvent.setup();
    render(
      <AttachmentPreviewGrid
        attachments={[makeAttachment("a", "foto.png", "done")]}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Ver vista previa de foto.png"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("foto.png")).toBeInTheDocument();
  });

  it("opens the PDF dialog on a done PDF attachment", async () => {
    const user = userEvent.setup();
    render(
      <AttachmentPreviewGrid
        attachments={[makeAttachment("a", "doc.pdf", "done", "application/pdf")]}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Ver vista previa de doc.pdf"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTitle("doc.pdf")).toBeInTheDocument();
  });

  it("does not make an uploading or errored attachment clickable", () => {
    render(
      <AttachmentPreviewGrid
        attachments={[
          makeAttachment("a", "uploading.png", "uploading"),
          makeAttachment("b", "broken.png", "error"),
        ]}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Ver vista previa de uploading.png")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ver vista previa de broken.png")).not.toBeInTheDocument();
  });

  it("shows a retry affordance for an error attachment and calls onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AttachmentPreviewGrid
        attachments={[makeAttachment("a", "broken.png", "error")]}
        onRemove={vi.fn()}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByLabelText("Reintentar subir broken.png"));
    expect(onRetry).toHaveBeenCalledWith("a");
  });

  it("calls onRemove when the remove button is clicked, regardless of status", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <AttachmentPreviewGrid
        attachments={[makeAttachment("a", "img1.png", "uploading")]}
        onRemove={onRemove}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Quitar img1.png"));
    expect(onRemove).toHaveBeenCalledWith("a");
  });
});
