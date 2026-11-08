import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, fireEvent } from "@testing-library/react";
import { toast } from "sonner";
import FileDropzone from "./FileDropzone";

// `render` (not `renderWithProviders`) doesn't mount a <Toaster/>, so
// sonner's real toast.* calls render nothing to assert on — spy on the
// module instead, matching FeedComposer.test.tsx's convention.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

/** Builds a DataTransfer-like object good enough for jsdom's `drop` event. */
function dataTransferWith(files: File[]) {
  return { files, items: [], types: ["Files"] };
}

beforeEach(() => {
  vi.mocked(toast.error).mockReset();
});

describe("FileDropzone", () => {
  it("calls onFilesSelected when a file is picked via the hidden input", async () => {
    const user = userEvent.setup();
    const onFilesSelected = vi.fn();
    const { container } = render(<FileDropzone hint="Máximo 10MB" onFilesSelected={onFilesSelected} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("doc.pdf", "application/pdf");
    await user.upload(input, file);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("calls onFilesSelected with every file when multiple is true", async () => {
    const user = userEvent.setup();
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone multiple hint="Máximo 10MB" onFilesSelected={onFilesSelected} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [makeFile("a.jpg", "image/jpeg"), makeFile("b.png", "image/png")];
    await user.upload(input, files);

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("calls onFilesSelected when a file is dropped on the dropzone", () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<FileDropzone hint="Máximo 10MB" onFilesSelected={onFilesSelected} />);

    const label = container.querySelector("label") as HTMLLabelElement;
    const file = makeFile("dropped.pdf", "application/pdf");
    fireEvent.drop(label, { dataTransfer: dataTransferWith([file]) });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("rejects a file over maxSizeBytes without calling onFilesSelected, and toasts an error", async () => {
    const user = userEvent.setup();
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone hint="Máximo 1MB" maxSizeBytes={1024 * 1024} onFilesSelected={onFilesSelected} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const tooLarge = makeFile("huge.jpg", "image/jpeg", 2 * 1024 * 1024);
    await user.upload(input, tooLarge);

    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("huge.jpg"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("1MB"));
  });

  it("doesn't call onFilesSelected on a drop when disabled", () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone hint="Máximo 10MB" disabled onFilesSelected={onFilesSelected} />,
    );

    const label = container.querySelector("label") as HTMLLabelElement;
    const file = makeFile("dropped.pdf", "application/pdf");
    fireEvent.drop(label, { dataTransfer: dataTransferWith([file]) });

    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
