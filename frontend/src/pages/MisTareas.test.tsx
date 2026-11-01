import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import MisTareas from "./MisTareas";
import * as api from "../services/api";
import type { MyActivity } from "../types/activity";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listMyActivitiesRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

function activityFixture(overrides: Partial<MyActivity> = {}): MyActivity {
  return {
    id: 1,
    projectId: 5,
    ownerId: 1,
    title: "Redactar informe",
    description: null,
    dueDate: new Date().toISOString(),
    status: "PENDING",
    priority: "MEDIA",
    position: 0,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    labels: [],
    project: { id: 5, name: "Proyecto Agua Limpia", archived: false },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.listMyActivitiesRequest).mockReset();
});

describe("MisTareas — empty states", () => {
  it("shows the unfiltered empty state when the user has no assigned tasks", async () => {
    seedAuth();
    vi.mocked(api.listMyActivitiesRequest).mockResolvedValue([]);
    renderWithProviders(<MisTareas />);

    expect(
      await screen.findByText("Todavía no tienes tareas asignadas en ningún proyecto."),
    ).toBeInTheDocument();
  });
});

describe("MisTareas — grouping by project", () => {
  it("groups tasks under their project's heading and links each to its activity", async () => {
    seedAuth();
    vi.mocked(api.listMyActivitiesRequest).mockResolvedValue([
      activityFixture({ id: 1, title: "Redactar informe", projectId: 5, project: { id: 5, name: "Proyecto Agua Limpia", archived: false } }),
      activityFixture({ id: 2, title: "Revisar encuestas", projectId: 5, project: { id: 5, name: "Proyecto Agua Limpia", archived: false } }),
      activityFixture({ id: 3, title: "Diseñar folleto", projectId: 8, project: { id: 8, name: "Proyecto Reciclaje", archived: false } }),
    ]);
    renderWithProviders(<MisTareas />);

    expect(await screen.findByText("Proyecto Agua Limpia")).toBeInTheDocument();
    expect(screen.getByText("Proyecto Reciclaje")).toBeInTheDocument();
    expect(screen.getByText("Redactar informe")).toBeInTheDocument();
    expect(screen.getByText("Revisar encuestas")).toBeInTheDocument();
    expect(screen.getByText("Diseñar folleto")).toBeInTheDocument();

    const link = screen.getByText("Redactar informe").closest("a");
    expect(link).toHaveAttribute("href", "/proyectos/5/actividades/1");
  });
});

describe("MisTareas — status filter", () => {
  it("re-queries with the selected status filter and shows the filtered empty state", async () => {
    seedAuth();
    vi.mocked(api.listMyActivitiesRequest).mockResolvedValue([activityFixture()]);

    const user = userEvent.setup();
    renderWithProviders(<MisTareas />);

    await screen.findByText("Redactar informe");
    vi.mocked(api.listMyActivitiesRequest).mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Completada" }));

    await waitFor(() =>
      expect(api.listMyActivitiesRequest).toHaveBeenCalledWith("test-token", { status: "DONE" }),
    );
    expect(
      await screen.findByText("No tienes tareas asignadas con este filtro."),
    ).toBeInTheDocument();
  });
});
