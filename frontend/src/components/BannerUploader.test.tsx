import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import BannerUploader from "./BannerUploader";
import * as api from "../services/api";
import { toast } from "sonner";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    uploadFileRequest: vi.fn(),
  };
});

// `renderWithProviders` doesn't mount a <Toaster/>, so sonner's real toast.*
// calls render nothing to assert on — spy on the module instead (mirrors
// FeedComposer.test.tsx's pattern).
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function makeImageFile(name = "banner.png", type = "image/png", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  vi.mocked(api.uploadFileRequest).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
  seedAuth();
});

describe("BannerUploader", () => {
  it("uploads a valid image, saves its url, and shows a success toast", async () => {
    vi.mocked(api.uploadFileRequest).mockResolvedValue({
      url: "https://cdn.example.com/banner.png",
      fileName: "banner.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = renderWithProviders(<BannerUploader hasBanner={false} onSave={onSave} />);

    const user = userEvent.setup();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeImageFile());

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("https://cdn.example.com/banner.png"));
    expect(api.uploadFileRequest).toHaveBeenCalledWith("test-token", expect.any(File));
    expect(toast.success).toHaveBeenCalledWith("Banner actualizado");
  });

  it("rejects a non-image file without uploading", async () => {
    const onSave = vi.fn();
    const { container } = renderWithProviders(<BannerUploader hasBanner={false} onSave={onSave} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    // `userEvent.upload` enforces the input's `accept` attribute itself (it
    // won't "select" a mismatched file at all), so this uses `fireEvent`
    // directly to exercise BannerUploader's own client-side type check.
    Object.defineProperty(input, "files", { value: [textFile] });
    fireEvent.change(input);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Solo se permiten imágenes JPG, PNG, WEBP o GIF."),
    );
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects an oversized file without uploading", async () => {
    const onSave = vi.fn();
    const { container } = renderWithProviders(<BannerUploader hasBanner={false} onSave={onSave} />);

    const user = userEvent.setup();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeImageFile("huge.png", "image/png", 1);
    Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, bigFile);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("La imagen supera el tamaño máximo permitido (10MB)."),
    );
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("removes the banner directly without any upload when 'Quitar imagen' is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { getByRole } = renderWithProviders(<BannerUploader hasBanner={true} onSave={onSave} />);

    const user = userEvent.setup();
    await user.click(getByRole("button", { name: "Quitar imagen" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Banner actualizado");
  });
});
