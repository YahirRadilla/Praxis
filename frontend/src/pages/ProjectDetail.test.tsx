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
  };
});

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
