import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import Equipos from "./Equipos";
import Guardados from "./Guardados";
import MisProyectos from "./MisProyectos";
import * as api from "../services/api";
import type { Project } from "../types/project";
import type { TeamMember } from "../types/team";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listMyProjectsRequest: vi.fn(),
    listSavedProjectsRequest: vi.fn(),
    listTeamRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

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
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
});

describe("MisProyectos", () => {
  it("shows the empty state when the user has no projects", async () => {
    seedAuth();
    vi.mocked(api.listMyProjectsRequest).mockResolvedValue([]);
    renderWithProviders(<MisProyectos />);

    expect(await screen.findByText("Todavía no participas en ningún proyecto.")).toBeInTheDocument();
  });

  it("lists the user's projects", async () => {
    seedAuth();
    vi.mocked(api.listMyProjectsRequest).mockResolvedValue([
      projectFixture({ id: 7, name: "Reciclaje UABCS" }),
    ]);
    renderWithProviders(<MisProyectos />);

    expect(await screen.findByText("Reciclaje UABCS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reciclaje UABCS/ })).toHaveAttribute("href", "/proyectos/7");
  });
});

describe("Guardados", () => {
  it("shows the empty state when nothing is saved", async () => {
    seedAuth();
    vi.mocked(api.listSavedProjectsRequest).mockResolvedValue([]);
    renderWithProviders(<Guardados />);

    expect(await screen.findByText("Todavía no guardaste ningún proyecto.")).toBeInTheDocument();
  });

  it("lists the user's saved projects", async () => {
    seedAuth();
    vi.mocked(api.listSavedProjectsRequest).mockResolvedValue([
      projectFixture({ id: 3, name: "Huertos urbanos" }),
    ]);
    renderWithProviders(<Guardados />);

    expect(await screen.findByText("Huertos urbanos")).toBeInTheDocument();
  });
});

describe("Equipos", () => {
  it("shows the empty state when the user is in no project", async () => {
    seedAuth();
    vi.mocked(api.listMyProjectsRequest).mockResolvedValue([]);
    renderWithProviders(<Equipos />);

    expect(await screen.findByText("Todavía no participas en ningún proyecto.")).toBeInTheDocument();
  });

  it("lists each project's team members, and shows the empty sub-state for a team with none", async () => {
    seedAuth();
    const members: TeamMember[] = [
      { id: 2, name: "Integrante Uno", email: "u1@uabcs.mx", accountType: "STUDENT", role: "COLLABORATOR" },
    ];
    vi.mocked(api.listMyProjectsRequest).mockResolvedValue([
      projectFixture({ id: 4, name: "Proyecto Con Equipo" }),
      projectFixture({ id: 5, name: "Proyecto Sin Equipo" }),
    ]);
    vi.mocked(api.listTeamRequest).mockImplementation((projectId: number) =>
      Promise.resolve(projectId === 4 ? members : []),
    );
    renderWithProviders(<Equipos />);

    expect(await screen.findByText("Proyecto Con Equipo")).toBeInTheDocument();
    expect(screen.getByText("Proyecto Sin Equipo")).toBeInTheDocument();
    expect(await screen.findByText("Integrante Uno")).toBeInTheDocument();
    expect(await screen.findByText("Todavía sin integrantes.")).toBeInTheDocument();
  });
});
