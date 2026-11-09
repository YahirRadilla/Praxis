import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import CvUploader from "./CvUploader";
import * as api from "../services/api";
import { toast } from "sonner";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    uploadFileRequest: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function makePdfFile(name = "cv.pdf", type = "application/pdf", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  vi.mocked(api.uploadFileRequest).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
  seedAuth();
});

describe("CvUploader", () => {
  it("uploads a valid PDF, saves its url, and shows a success toast", async () => {
    vi.mocked(api.uploadFileRequest).mockResolvedValue({
      url: "https://cdn.example.com/cv.pdf",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = renderWithProviders(<CvUploader cvUrl={null} onSave={onSave} />);

    const user = userEvent.setup();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makePdfFile());

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("https://cdn.example.com/cv.pdf"));
    expect(api.uploadFileRequest).toHaveBeenCalledWith("test-token", expect.any(File));
    expect(toast.success).toHaveBeenCalledWith("CV actualizado");
  });

  it("rejects a non-PDF/DOC/DOCX file without uploading", async () => {
    const onSave = vi.fn();
    const { container } = renderWithProviders(<CvUploader cvUrl={null} onSave={onSave} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [textFile] });
    fireEvent.change(input);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Solo se permiten archivos PDF o Word."),
    );
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects an oversized file without uploading", async () => {
    const onSave = vi.fn();
    const { container } = renderWithProviders(<CvUploader cvUrl={null} onSave={onSave} />);

    const user = userEvent.setup();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makePdfFile("huge.pdf", "application/pdf", 1);
    Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, bigFile);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("El archivo supera el tamaño máximo permitido (10MB)."),
    );
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("removes the CV directly without any upload when 'Quitar CV' is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { getByRole } = renderWithProviders(<CvUploader cvUrl="https://cdn.example.com/cv.pdf" onSave={onSave} />);

    const user = userEvent.setup();
    await user.click(getByRole("button", { name: "Quitar CV" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("CV actualizado");
  });

  it("shows 'Reemplazar CV' instead of 'Subir CV' when a CV already exists", () => {
    const { getByRole } = renderWithProviders(
      <CvUploader cvUrl="https://cdn.example.com/cv.pdf" onSave={vi.fn()} />,
    );

    expect(getByRole("button", { name: "Reemplazar CV" })).toBeInTheDocument();
  });
});
