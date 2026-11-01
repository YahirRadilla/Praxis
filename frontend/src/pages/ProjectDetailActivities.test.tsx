import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import ProjectDetail from "./ProjectDetail";
import * as api from "../services/api";
import type { Project, ProjectViewer } from "../types/project";
import type { Activity, ActivityDetail } from "../types/activity";
import type { TeamMember } from "../types/team";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getProjectRequest: vi.fn(),
    listTeamRequest: vi.fn(),
    listPendingRequestsRequest: vi.fn(),
    listActivitiesRequest: vi.fn(),
    listProgressUpdatesRequest: vi.fn(),
    listDictamenesRequest: vi.fn(),
    listSavedProjectsRequest: vi.fn(),
    searchUsersRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
    listLabelsRequest: vi.fn(),
    createLabelRequest: vi.fn(),
    createActivityRequest: vi.fn(),
    moveActivityRequest: vi.fn(),
    deleteActivityRequest: vi.fn(),
    getActivityDetailRequest: vi.fn(),
    updateActivityRequest: vi.fn(),
    createChecklistSectionRequest: vi.fn(),
    updateChecklistSectionRequest: vi.fn(),
    deleteChecklistSectionRequest: vi.fn(),
    createChecklistItemRequest: vi.fn(),
    updateChecklistItemRequest: vi.fn(),
    deleteChecklistItemRequest: vi.fn(),
    createActivityCommentRequest: vi.fn(),
    deleteActivityCommentRequest: vi.fn(),
    createActivityAttachmentRequest: vi.fn(),
    deleteActivityAttachmentRequest: vi.fn(),
    uploadFileRequest: vi.fn(),
  };
});

const OWNER = { id: 1, name: "Dueña del Proyecto", accountType: "STUDENT" };
const MEMBER: TeamMember = { id: 2, name: "Integrante Uno", accountType: "STUDENT", role: "COLLABORATOR" };

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

function activityFixture(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 10,
    projectId: 5,
    ownerId: OWNER.id,
    title: "Diseñar encuesta",
    description: null,
    dueDate: new Date().toISOString(),
    status: "PENDING",
    priority: "MEDIA",
    position: 0,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: OWNER,
    assignees: [],
    labels: [],
    _count: { comments: 0, attachments: 0 },
    checklistItems: [],
    ...overrides,
  };
}

function activityDetailFixture(overrides: Partial<ActivityDetail> = {}): ActivityDetail {
  return {
    id: 10,
    projectId: 5,
    ownerId: OWNER.id,
    title: "Diseñar encuesta",
    description: null,
    dueDate: new Date().toISOString(),
    status: "PENDING",
    priority: "MEDIA",
    position: 0,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: OWNER,
    assignees: [],
    labels: [],
    checklistSections: [],
    checklistItems: [],
    comments: [],
    attachments: [],
    events: [],
    project: { id: 5, archived: false, ownerId: OWNER.id, visibility: "PUBLIC" },
    ...overrides,
  };
}

function renderBoard(route = "/proyectos/5?tab=actividades") {
  return renderWithProviders(
    <Routes>
      <Route path="/proyectos/:id" element={<ProjectDetail />} />
      <Route path="/proyectos/:id/actividades/:activityId" element={<ProjectDetail />} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.mocked(api.listTeamRequest).mockResolvedValue([MEMBER]);
  vi.mocked(api.listPendingRequestsRequest).mockResolvedValue([]);
  vi.mocked(api.listProgressUpdatesRequest).mockResolvedValue([]);
  vi.mocked(api.listDictamenesRequest).mockResolvedValue([]);
  vi.mocked(api.listSavedProjectsRequest).mockResolvedValue([]);
  vi.mocked(api.searchUsersRequest).mockResolvedValue([]);
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.listLabelsRequest).mockResolvedValue([]);
  vi.mocked(api.listActivitiesRequest).mockResolvedValue([]);
  vi.mocked(api.getActivityDetailRequest).mockReset();
  vi.mocked(api.createActivityRequest).mockReset();
  vi.mocked(api.moveActivityRequest).mockReset();
  vi.mocked(api.updateChecklistItemRequest).mockReset();
  vi.mocked(api.createChecklistItemRequest).mockReset();
  vi.mocked(api.createActivityCommentRequest).mockReset();
  vi.mocked(api.createActivityAttachmentRequest).mockReset();
  vi.mocked(api.uploadFileRequest).mockReset();
});

describe("ActivityBoard — 4 status columns", () => {
  it("groups activities under their status column's count badge", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([
      activityFixture({ id: 1, status: "PENDING" }),
      activityFixture({ id: 2, status: "PENDING", title: "Segunda pendiente" }),
      activityFixture({ id: 3, status: "IN_PROGRESS", title: "En curso" }),
      activityFixture({ id: 4, status: "TO_VALIDATE", title: "A validar" }),
      activityFixture({ id: 5, status: "DONE", title: "Lista" }),
    ]);
    renderBoard();

    const pendingPill = await screen.findByText("Pendiente");
    expect(screen.getByText("En progreso")).toBeInTheDocument();
    expect(screen.getByText("Por validar")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();

    const pendingHeader = pendingPill.parentElement!;
    expect(pendingHeader.textContent).toContain("2");

    expect(screen.getByText("Diseñar encuesta")).toBeInTheDocument();
    expect(screen.getByText("Segunda pendiente")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("A validar")).toBeInTheDocument();
    expect(screen.getByText("Lista")).toBeInTheDocument();
  });
});

describe("ActivityBoard — viewer gating", () => {
  it("lets a member add activities and move cards via the card menu", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    renderBoard();

    expect(await screen.findByLabelText("Agregar actividad en Pendiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Opciones de la actividad")).toBeInTheDocument();
  });

  it("hides the add-activity controls and card menu for an evaluator who isn't a member", async () => {
    seedAuth({ accountType: "TEACHER", id: 9 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        teacherId: 9,
        viewer: viewerFixture({ isEvaluator: true, canSeeBoard: true }),
      }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    renderBoard();

    await screen.findByText("Pendiente");
    expect(screen.queryByLabelText("Agregar actividad en Pendiente")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Opciones de la actividad")).not.toBeInTheDocument();
  });

  it("blocks write controls for a member once the project is archived, but the board still reads", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        archived: true,
        viewer: viewerFixture({ isMember: true, canSeeBoard: true }),
      }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    renderBoard();

    expect(await screen.findByText("Diseñar encuesta")).toBeInTheDocument();
    expect(screen.queryByLabelText("Agregar actividad en Pendiente")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Opciones de la actividad")).not.toBeInTheDocument();
  });
});

describe("CreateActivityForm — responsible person + due date", () => {
  it("creates an activity with the typed title, a chosen due date, and an assignee", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([]);
    vi.mocked(api.createActivityRequest).mockResolvedValue(activityFixture());

    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByLabelText("Agregar actividad en Pendiente"));
    await user.type(screen.getByPlaceholderText("Título de la actividad"), "Recolectar encuestas");

    await user.click(screen.getByRole("button", { name: "Fecha límite" }));
    const dayButtons = await screen.findAllByRole("button");
    const day15 = dayButtons.find((b) => b.textContent === "15");
    expect(day15).toBeDefined();
    await user.click(day15!);

    await user.click(screen.getByText("Sin responsables"));
    await user.click(screen.getByText(MEMBER.name));
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => expect(api.createActivityRequest).toHaveBeenCalled());
    const [, , payload] = vi.mocked(api.createActivityRequest).mock.calls[0];
    expect(payload).toMatchObject({
      title: "Recolectar encuestas",
      priority: "MEDIA",
      status: "PENDING",
      assigneeIds: [MEMBER.id],
    });
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-15$/);
  });
});

describe("ActivityDetailModal — checklist, comments, attachments", () => {
  it("toggles a checklist item and adds a new unsectioned item", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    vi.mocked(api.getActivityDetailRequest).mockResolvedValue(
      activityDetailFixture({
        checklistItems: [
          { id: 100, activityId: 10, sectionId: null, text: "Revisar borrador", note: null, done: false, position: 0, doneById: null, doneAt: null },
        ],
      }),
    );
    vi.mocked(api.updateChecklistItemRequest).mockResolvedValue({
      id: 100, activityId: 10, sectionId: null, text: "Revisar borrador", note: null, done: true, position: 0, doneById: MEMBER.id, doneAt: new Date().toISOString(),
    });
    vi.mocked(api.createChecklistItemRequest).mockResolvedValue({
      id: 101, activityId: 10, sectionId: null, text: "Nuevo pendiente", note: null, done: false, position: 1, doneById: null, doneAt: null,
    });

    const user = userEvent.setup();
    renderBoard("/proyectos/5/actividades/10?tab=actividades");

    const checkbox = await screen.findByLabelText('Marcar "Revisar borrador" como completado');
    await user.click(checkbox);
    await waitFor(() =>
      expect(api.updateChecklistItemRequest).toHaveBeenCalledWith("test-token", 5, 10, 100, { done: true }),
    );

    await user.click(screen.getByText("Agregar pendiente"));
    await user.type(screen.getByPlaceholderText("Nuevo pendiente"), "Nuevo pendiente");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(api.createChecklistItemRequest).toHaveBeenCalledWith("test-token", 5, 10, {
        text: "Nuevo pendiente",
        sectionId: undefined,
      }),
    );
  });

  it("lets a member post a comment", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    vi.mocked(api.getActivityDetailRequest).mockResolvedValue(activityDetailFixture());
    vi.mocked(api.createActivityCommentRequest).mockResolvedValue({
      id: 1, activityId: 10, authorId: MEMBER.id, text: "Buen avance", createdAt: new Date().toISOString(), author: MEMBER,
    });

    const user = userEvent.setup();
    renderBoard("/proyectos/5/actividades/10?tab=actividades");

    await screen.findByText("Todavía no hay comentarios.");
    await user.type(screen.getByPlaceholderText("Escribe un comentario…"), "Buen avance");
    await user.click(screen.getByRole("button", { name: "Comentar" }));

    await waitFor(() =>
      expect(api.createActivityCommentRequest).toHaveBeenCalledWith("test-token", 5, 10, { text: "Buen avance" }),
    );
  });

  it("lets a non-member evaluator comment but keeps every field read-only", async () => {
    seedAuth({ accountType: "TEACHER", id: 9 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ teacherId: 9, viewer: viewerFixture({ isEvaluator: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    vi.mocked(api.getActivityDetailRequest).mockResolvedValue(activityDetailFixture());

    renderBoard("/proyectos/5/actividades/10?tab=actividades");

    expect(await screen.findByPlaceholderText("Escribe un comentario…")).toBeInTheDocument();
    expect(screen.getByLabelText("Título de la actividad")).toBeDisabled();
  });

  it("hides the comment form entirely once the project is archived, even for an evaluator", async () => {
    seedAuth({ accountType: "TEACHER", id: 9 });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({
        teacherId: 9,
        archived: true,
        viewer: viewerFixture({ isEvaluator: true, canSeeBoard: true }),
      }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    vi.mocked(api.getActivityDetailRequest).mockResolvedValue(
      activityDetailFixture({ project: { id: 5, archived: true, ownerId: OWNER.id, visibility: "PUBLIC" } }),
    );

    renderBoard("/proyectos/5/actividades/10?tab=actividades");

    await screen.findByLabelText("Título de la actividad");
    expect(screen.queryByPlaceholderText("Escribe un comentario…")).not.toBeInTheDocument();
  });

  it("uploads a file and attaches it to the activity", async () => {
    seedAuth({ accountType: "STUDENT", id: MEMBER.id });
    vi.mocked(api.getProjectRequest).mockResolvedValue(
      projectFixture({ viewer: viewerFixture({ isMember: true, canSeeBoard: true }) }),
    );
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([activityFixture()]);
    vi.mocked(api.getActivityDetailRequest).mockResolvedValue(activityDetailFixture());
    vi.mocked(api.uploadFileRequest).mockResolvedValue({
      url: "https://files.example.com/evidencia.pdf",
      fileName: "evidencia.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });
    vi.mocked(api.createActivityAttachmentRequest).mockResolvedValue({
      id: 1, activityId: 10, uploaderId: MEMBER.id, url: "https://files.example.com/evidencia.pdf", fileName: "evidencia.pdf", mimeType: "application/pdf", sizeBytes: 2048, createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderBoard("/proyectos/5/actividades/10?tab=actividades");

    await screen.findByText("Sin adjuntos.");
    const file = new File(["contenido"], "evidencia.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(api.uploadFileRequest).toHaveBeenCalledWith("test-token", file));
    await waitFor(() =>
      expect(api.createActivityAttachmentRequest).toHaveBeenCalledWith("test-token", 5, 10, {
        url: "https://files.example.com/evidencia.pdf",
        fileName: "evidencia.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      }),
    );
  });
});

describe("ActivityDetailModal — outsider deep link", () => {
  it("doesn't open the modal (and never fetches it) for a visitor without board access", async () => {
    vi.mocked(api.getProjectRequest).mockResolvedValue(projectFixture());
    vi.mocked(api.listActivitiesRequest).mockResolvedValue([]);
    renderBoard("/proyectos/5/actividades/10");

    await screen.findByText("La problemática");
    expect(screen.queryByLabelText("Título de la actividad")).not.toBeInTheDocument();
    expect(api.getActivityDetailRequest).not.toHaveBeenCalled();
  });
});
