import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import ProjectDetail from "./ProjectDetail";
import * as api from "../services/api";
import type { Project, ProjectViewer } from "../types/project";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getProjectRequest: vi.fn(),
    listTeamRequest: vi.fn(),
    listPendingRequestsRequest: vi.fn(),
    archiveProjectRequest: vi.fn(),
    unarchiveProjectRequest: vi.fn(),
    updateProjectRequest: vi.fn(),
    createDictamenRequest: vi.fn(),
    listDictamenesRequest: vi.fn(),
    listActivitiesRequest: vi.fn(),
    listProgressUpdatesRequest: vi.fn(),
    listProjectResourcesRequest: vi.fn(),
    listSavedProjectsRequest: vi.fn(),
    searchUsersRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
    uploadFileRequest: vi.fn(),
    createProgressUpdateRequest: vi.fn(),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function makeImageFile(name: string): File {
  return new File([new Uint8Array(8)], name, { type: "image/png" });
}

const OWNER = { id: 1, name: "Dueña del Proyecto", accountType: "STUDENT" };

function viewerFixture(overrides: Partial<ProjectViewer> = {}): ProjectViewer {
  return {
    isOwner: false,
    isMember: false,
    isEvaluator: false,
    pendingRequest: null,
    canRequestToJoin: false,
    canPost: false,
    canSubmitDictamen: false,
    canSeeBoard: false,
    ...overrides,
  };
}

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 5,
    name: "Proyecto Agua Limpia",
    description: "Descripción del proyecto",
    problemStatement: "La problemática",
    objectives: "Los objetivos",
    extendedInfo: null,
    visibility: "PUBLIC",
    archived: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: OWNER.id,
    teacherId: null,
    organizationId: null,
    owner: OWNER,
    teacher: null,
    organization: null,
    sdgs: [],
    categories: [],
    challenge: null,
    classGroup: null,
    ...overrides,
  };
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/proyectos/:id" element={<ProjectDetail />} />
    </Routes>,
    { route: "/proyectos/5" },
  );
}

beforeEach(() => {
  vi.mocked(api.listTeamRequest).mockResolvedValue([]);
  vi.mocked(api.listPendingRequestsRequest).mockResolvedValue([]);
  vi.mocked(api.listActivitiesRequest).mockResolvedValue([]);
  vi.mocked(api.listProgressUpdatesRequest).mockResolvedValue([]);
  vi.mocked(api.listProjectResourcesRequest).mockResolvedValue([]);
  vi.mocked(api.listDictamenesRequest).mockResolvedValue([]);
  vi.mocked(api.listSavedProjectsRequest).mockResolvedValue([]);
  vi.mocked(api.searchUsersRequest).mockResolvedValue([]);
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.archiveProjectRequest).mockReset();
  vi.mocked(api.unarchiveProjectRequest).mockReset();
  vi.mocked(api.updateProjectRequest).mockReset();
  vi.mocked(api.createDictamenRequest).mockReset();
  vi.mocked(api.uploadFileRequest).mockReset();
  vi.mocked(api.createProgressUpdateRequest).mockReset();
  // jsdom doesn't implement these — AttachmentPreviewGrid calls them for
  // image thumbnail previews.
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

describe("ProjectDetail — outsider tier (not authenticated)", () => {
  it("shows the project info but no owner/member actions", async () => {
    vi.mocked(api.getProjectRequest).mockResolvedValue(projectFixture());
    renderDetail();

    expect(await screen.findByText("La problemática")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar proyecto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compartir algo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });
});

describe("ProjectDetail — member tier", () => {
  it("can post to the feed but cannot see owner-only or evaluator-only controls", async () => {
    seedAuth({ accountType: "STUDENT", id: 2 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canPost: true, canSeeBoard: true }) }),
    );
    renderDetail();

    expect(await screen.findByRole("button", { name: "Compartir algo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar proyecto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();

    await screen.findByText("Dictamen");
    expect(screen.queryByLabelText("Va bien")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sugiere cambios")).not.toBeInTheDocument();
  });
});

describe("ProjectDetail — owner tier", () => {
  it("can edit, toggle visibility, and archive the project", async () => {
    seedAuth({ accountType: "STUDENT", id: OWNER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isOwner: true, isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.archiveProjectRequest).mockResolvedValue(projectFixture({ archived: true }));
    vi.mocked(api.updateProjectRequest).mockResolvedValue(projectFixture());

    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByRole("button", { name: "Editar proyecto" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hacer privado" }));
    await user.click(screen.getByRole("button", { name: "Hacer privado" }));
    await waitFor(() =>
      expect(api.updateProjectRequest).toHaveBeenCalledWith("test-token", 5, { visibility: "PRIVATE" }),
    );

    await user.click(screen.getByRole("button", { name: "Archivar" }));
    await user.click(screen.getByRole("button", { name: "Archivar" }));
    await waitFor(() => expect(api.archiveProjectRequest).toHaveBeenCalledWith("test-token", 5));
  });

  it("shows 'Desarchivar' instead of edit/archive controls once archived", async () => {
    seedAuth({ accountType: "STUDENT", id: OWNER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        archived: true,
        viewer: viewerFixture({ isOwner: true, isMember: true, canSeeBoard: true }),
      }),
    );
    vi.mocked(api.unarchiveProjectRequest).mockResolvedValue(projectFixture({ archived: false }));

    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByText(/Este proyecto está archivado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();

    const unarchiveButtons = screen.getAllByRole("button", { name: "Desarchivar" });
    await user.click(unarchiveButtons[0]);
    await waitFor(() => expect(api.unarchiveProjectRequest).toHaveBeenCalledWith("test-token", 5));
  });
});

describe("ProjectDetail — concurrent evidence uploads (regression)", () => {
  it("resolves two concurrently selected evidence files independently, even when the second one's response arrives first", async () => {
    seedAuth({ accountType: "STUDENT", id: 2 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canPost: true, canSeeBoard: true }) }),
    );

    const defs = {
      "img1.png": deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>(),
      "img2.png": deferred<{ url: string; fileName: string; mimeType: string; sizeBytes: number }>(),
    };
    vi.mocked(api.uploadFileRequest).mockImplementation((_token, file) => defs[file.name as keyof typeof defs].promise);

    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Compartir algo" }));
    await user.click(screen.getByRole("button", { name: "Subir un archivo" }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, [makeImageFile("img1.png"), makeImageFile("img2.png")]);

    await waitFor(() => expect(api.uploadFileRequest).toHaveBeenCalledTimes(2));

    // Resolve the SECOND file's upload before the first one's — this is
    // exactly the race that left earlier files stuck on "Subiendo…" forever
    // when both calls shared one `useMutation()` instance.
    defs["img2.png"].resolve({
      url: "https://cdn.example.com/img2.png",
      fileName: "img2.png",
      mimeType: "image/png",
      sizeBytes: 8,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Ver vista previa de img2.png")).toBeInTheDocument(),
    );

    defs["img1.png"].resolve({
      url: "https://cdn.example.com/img1.png",
      fileName: "img1.png",
      mimeType: "image/png",
      sizeBytes: 8,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Ver vista previa de img1.png")).toBeInTheDocument(),
    );
  });
});

describe("ProjectDetail — Dictamen: only the assigned evaluator can submit", () => {
  it("shows the verdict form and submits it for the assigned evaluator", async () => {
    seedAuth({ accountType: "TEACHER", id: 9 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        teacherId: 9,
        teacher: { id: 9, name: "Profa. García", accountType: "TEACHER" },
        viewer: viewerFixture({ isEvaluator: true, canSubmitDictamen: true, canSeeBoard: true }),
      }),
    );
    vi.mocked(api.createDictamenRequest).mockResolvedValue({
      id: 1,
      verdict: "CHANGES_REQUESTED",
      comment: "Falta evidencia",
      createdAt: new Date().toISOString(),
      evaluator: { id: 9, name: "Profa. García", accountType: "TEACHER" },
    });

    const user = userEvent.setup();
    renderDetail();

    await screen.findByText("Dictamen");
    await user.click(screen.getByLabelText("Sugiere cambios"));
    await user.type(screen.getByPlaceholderText("Comentario"), "Falta evidencia");
    await user.click(screen.getByRole("button", { name: "Enviar retroalimentación" }));

    await waitFor(() => {
      expect(api.createDictamenRequest).toHaveBeenCalledWith("test-token", 5, {
        verdict: "CHANGES_REQUESTED",
        comment: "Falta evidencia",
      });
    });
  });

  it("does not show the verdict form for a member who isn't the assigned evaluator", async () => {
    seedAuth({ accountType: "STUDENT", id: 2 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        teacherId: 9,
        teacher: { id: 9, name: "Profa. García", accountType: "TEACHER" },
        viewer: viewerFixture({ isMember: true, canSeeBoard: true, canSubmitDictamen: false }),
      }),
    );
    renderDetail();

    await screen.findByText("Dictamen");
    expect(screen.queryByLabelText("Va bien")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar retroalimentación" })).not.toBeInTheDocument();
  });
});

describe("ProjectDetail — progress update: required text field hint (replaces native browser validation)", () => {
  it("blocks submission and shows a custom hint when the text is empty, then succeeds once filled", async () => {
    seedAuth({ accountType: "STUDENT", id: 2 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canPost: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.createProgressUpdateRequest).mockResolvedValue({
      id: 1,
      projectId: 5,
      activityId: null,
      authorId: 2,
      text: "Avance del proyecto",
      postedToFeed: true,
      validated: false,
      createdAt: new Date().toISOString(),
      author: { id: 2, name: "Estudiante" },
      evidence: [],
    });

    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Compartir algo" }));

    // Submitting with the required textarea empty must not call the
    // create-progress-update API, and must show the custom hint instead of
    // relying on the browser's native HTML5 validation popup.
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText("Completa este campo.")).toBeInTheDocument();
    expect(api.createProgressUpdateRequest).not.toHaveBeenCalled();

    // Typing into the flagged field and resubmitting succeeds.
    await user.type(
      screen.getByPlaceholderText("Comparte algo sobre el proyecto: una foto, un enlace, una reflexión."),
      "Avance del proyecto",
    );
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(api.createProgressUpdateRequest).toHaveBeenCalled());
  });
});
