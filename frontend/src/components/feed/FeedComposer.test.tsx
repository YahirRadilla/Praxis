import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../../test-utils";
import FeedComposer from "./FeedComposer";
import * as api from "../../services/api";
import { toast } from "sonner";
import type { Project } from "../../types/project";

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>("../../services/api");
  return {
    ...actual,
    listMyProjectsRequest: vi.fn(),
    uploadFileRequest: vi.fn(),
    createProgressUpdateRequest: vi.fn(),
  };
});

// `renderWithProviders` doesn't mount a <Toaster/>, so sonner's real
// toast.* calls render nothing to assert on — spy on the module instead.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "Proyecto Agua Limpia",
    description: "Descripción",
    problemStatement: "",
    objectives: "",
    extendedInfo: null,
    visibility: "PUBLIC",
    archived: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 1,
    teacherId: null,
    organizationId: null,
    owner: { id: 1, name: "Dueña", accountType: "STUDENT" },
    teacher: null,
    organization: null,
    sdgs: [],
    categories: [],
    challenge: null,
    classGroup: null,
    viewer: {
      isOwner: true,
      isMember: true,
      isEvaluator: false,
      pendingRequest: null,
      canRequestToJoin: false,
      canPost: true,
      canSubmitDictamen: false,
      canSeeBoard: true,
    },
    ...overrides,
  };
}

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

/** A controllable upload promise so a test can assert mid-flight state
 * before resolving it. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function openComposer() {
  const user = userEvent.setup();
  renderWithProviders(<FeedComposer />);
  await user.click(screen.getByText("Comparte un avance de tu proyecto"));
  return user;
}

// jsdom doesn't implement these — the composer calls them for image
// thumbnail previews, so stub them for every test in this file.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(api.listMyProjectsRequest).mockReset();
  vi.mocked(api.uploadFileRequest).mockReset();
  vi.mocked(api.createProgressUpdateRequest).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(api.listMyProjectsRequest).mockResolvedValue([projectFixture()]);
});

describe("FeedComposer — file uploads", () => {
  it("uploads each selected file (images + PDF) individually", async () => {
    seedAuth();
    vi.mocked(api.uploadFileRequest).mockImplementation((_token, file: File) =>
      Promise.resolve({
        url: `https://cdn.example.com/${file.name}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    );

    const user = await openComposer();
    const input = screen.getByLabelText("Adjuntar archivos");
    const files = [
      makeFile("img1.jpg", "image/jpeg"),
      makeFile("img2.png", "image/png"),
      makeFile("doc.pdf", "application/pdf"),
    ];

    await user.upload(input, files);

    await waitFor(() => expect(api.uploadFileRequest).toHaveBeenCalledTimes(3));
  });

  it("disables Publicar while an upload is still pending, then enables it once resolved", async () => {
    seedAuth();
    const pending = deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>();
    vi.mocked(api.uploadFileRequest).mockReturnValue(pending.promise);

    const user = await openComposer();
    const input = screen.getByLabelText("Adjuntar archivos");
    await user.upload(input, makeFile("img1.jpg", "image/jpeg"));

    const publishButton = screen.getByRole("button", { name: "Publicar" });
    expect(publishButton).toBeDisabled();

    pending.resolve({
      url: "https://cdn.example.com/img1.jpg",
      fileName: "img1.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });

    await waitFor(() => expect(publishButton).not.toBeDisabled());
  });

  it("submits FILE evidence for every successfully uploaded attachment", async () => {
    seedAuth();
    vi.mocked(api.uploadFileRequest).mockImplementation((_token, file: File) =>
      Promise.resolve({
        url: `https://cdn.example.com/${file.name}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    );
    vi.mocked(api.createProgressUpdateRequest).mockResolvedValue({
      id: 1,
      projectId: 1,
      activityId: null,
      authorId: 1,
      text: "Avance",
      postedToFeed: true,
      validated: false,
      createdAt: new Date().toISOString(),
      author: { id: 1, name: "Estudiante" },
      evidence: [],
    });

    const user = await openComposer();
    await user.selectOptions(screen.getByRole("combobox"), "1");
    await user.type(screen.getByPlaceholderText("¿Qué avanzaste?"), "Avance");

    const input = screen.getByLabelText("Adjuntar archivos");
    const files = [
      makeFile("img1.jpg", "image/jpeg"),
      makeFile("img2.png", "image/png"),
      makeFile("doc.pdf", "application/pdf"),
    ];
    await user.upload(input, files);

    await waitFor(() => expect(api.uploadFileRequest).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar" })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(api.createProgressUpdateRequest).toHaveBeenCalled());
    const payload = vi.mocked(api.createProgressUpdateRequest).mock.calls[0][2];
    expect(payload.evidence).toHaveLength(3);
    expect(payload.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "FILE", url: "https://cdn.example.com/img1.jpg", fileName: "img1.jpg" }),
        expect.objectContaining({ type: "FILE", url: "https://cdn.example.com/img2.png", fileName: "img2.png" }),
        expect.objectContaining({ type: "FILE", url: "https://cdn.example.com/doc.pdf", fileName: "doc.pdf" }),
      ]),
    );
  });

  it("includes the URL input as an extra LINK item alongside uploaded FILE evidence", async () => {
    seedAuth();
    vi.mocked(api.uploadFileRequest).mockResolvedValue({
      url: "https://cdn.example.com/img1.jpg",
      fileName: "img1.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    vi.mocked(api.createProgressUpdateRequest).mockResolvedValue({
      id: 1,
      projectId: 1,
      activityId: null,
      authorId: 1,
      text: "Avance",
      postedToFeed: true,
      validated: false,
      createdAt: new Date().toISOString(),
      author: { id: 1, name: "Estudiante" },
      evidence: [],
    });

    const user = await openComposer();
    await user.selectOptions(screen.getByRole("combobox"), "1");
    await user.type(screen.getByPlaceholderText("¿Qué avanzaste?"), "Avance");
    await user.type(
      screen.getByPlaceholderText("Enlace a evidencia (opcional)"),
      "https://example.com/extra",
    );

    const input = screen.getByLabelText("Adjuntar archivos");
    await user.upload(input, makeFile("img1.jpg", "image/jpeg"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(api.createProgressUpdateRequest).toHaveBeenCalled());
    const payload = vi.mocked(api.createProgressUpdateRequest).mock.calls[0][2];
    expect(payload.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "FILE", url: "https://cdn.example.com/img1.jpg" }),
        expect.objectContaining({ type: "LINK", url: "https://example.com/extra" }),
      ]),
    );
  });

  it("rejects a file over 10MB without calling uploadFileRequest for it", async () => {
    seedAuth();
    const user = await openComposer();
    const input = screen.getByLabelText("Adjuntar archivos");
    const tooLarge = makeFile("huge.jpg", "image/jpeg", 11 * 1024 * 1024);

    await user.upload(input, tooLarge);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("supera el límite de 10 MB")),
    );
    expect(api.uploadFileRequest).not.toHaveBeenCalled();
  });

  it("resolves two concurrently selected files independently, even when the second one's response arrives first", async () => {
    seedAuth();
    const defs = {
      "img1.jpg": deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>(),
      "img2.png": deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>(),
    };
    vi.mocked(api.uploadFileRequest).mockImplementation((_token, file: File) =>
      defs[file.name as keyof typeof defs].promise,
    );

    const user = await openComposer();
    const input = screen.getByLabelText("Adjuntar archivos");
    await user.upload(input, [makeFile("img1.jpg", "image/jpeg"), makeFile("img2.png", "image/png")]);

    await waitFor(() => expect(api.uploadFileRequest).toHaveBeenCalledTimes(2));

    // Out-of-order resolution: the second file's response lands first —
    // both must still reach "done" on their own, independently.
    defs["img2.png"].resolve({
      url: "https://cdn.example.com/img2.png",
      fileName: "img2.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Ver vista previa de img2.png")).toBeInTheDocument(),
    );

    defs["img1.jpg"].resolve({
      url: "https://cdn.example.com/img1.jpg",
      fileName: "img1.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Ver vista previa de img1.jpg")).toBeInTheDocument(),
    );
  });

  it("rejects a second PDF while one is already attached/attaching", async () => {
    seedAuth();
    const pending = deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>();
    vi.mocked(api.uploadFileRequest).mockReturnValue(pending.promise);

    const user = await openComposer();
    const input = screen.getByLabelText("Adjuntar archivos");

    await user.upload(input, makeFile("doc1.pdf", "application/pdf"));
    expect(api.uploadFileRequest).toHaveBeenCalledTimes(1);

    await user.upload(input, makeFile("doc2.pdf", "application/pdf"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("un PDF por publicación")),
    );
    expect(api.uploadFileRequest).toHaveBeenCalledTimes(1);
  });
});

describe("FeedComposer — required text field hint (replaces native browser validation)", () => {
  it("blocks submission and shows a custom hint when the text is empty, then succeeds once filled", async () => {
    seedAuth();
    vi.mocked(api.createProgressUpdateRequest).mockResolvedValue({
      id: 1,
      projectId: 1,
      activityId: null,
      authorId: 1,
      text: "Avance",
      postedToFeed: true,
      validated: false,
      createdAt: new Date().toISOString(),
      author: { id: 1, name: "Estudiante" },
      evidence: [],
    });

    const user = await openComposer();
    await user.selectOptions(screen.getByRole("combobox"), "1");

    // Submitting with the required textarea empty must not call the
    // create-post API, and must show the custom hint instead of relying on
    // the browser's native HTML5 validation popup.
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText("Completa este campo.")).toBeInTheDocument();
    expect(api.createProgressUpdateRequest).not.toHaveBeenCalled();

    // Typing into the flagged field and resubmitting succeeds.
    await user.type(screen.getByPlaceholderText("¿Qué avanzaste?"), "Avance");
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(api.createProgressUpdateRequest).toHaveBeenCalled());
  });
});
