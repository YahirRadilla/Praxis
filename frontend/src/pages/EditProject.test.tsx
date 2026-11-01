import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders, seedAuth } from "../test-utils";
import EditProject from "./EditProject";
import * as api from "../services/api";
import type { Project } from "../types/project";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listSdgsRequest: vi.fn(),
    listCategoriesRequest: vi.fn(),
    getProjectRequest: vi.fn(),
    updateProjectRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

// EditProject instantiates a real IntersectionObserver for its nav-highlight
// effect; jsdom doesn't implement one.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const OWNER_ID = 1;
const CATEGORIES = [{ id: 1, name: "Tecnología", colorHex: "#123456", icon: "code" }];

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
    ownerId: OWNER_ID,
    teacherId: null,
    organizationId: null,
    owner: { id: OWNER_ID, name: "Dueña del Proyecto", accountType: "STUDENT" },
    teacher: null,
    organization: null,
    sdgs: [],
    categories: [{ projectId: 5, categoryId: 1, category: CATEGORIES[0] }],
    challenge: null,
    classGroup: null,
    ...overrides,
  };
}

function renderEdit() {
  return renderWithProviders(
    <Routes>
      <Route path="/proyectos/:id/editar" element={<EditProject />} />
    </Routes>,
    { route: "/proyectos/5/editar" },
  );
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  vi.mocked(api.listSdgsRequest).mockResolvedValue([]);
  vi.mocked(api.listCategoriesRequest).mockResolvedValue(CATEGORIES);
  vi.mocked(api.getProjectRequest).mockResolvedValue(projectFixture());
  vi.mocked(api.updateProjectRequest).mockReset();
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  seedAuth({ accountType: "STUDENT", id: OWNER_ID });
});

describe("EditProject — does not expose a Reto/Grupo de clase editor", () => {
  it("has no 'Reto' or 'Grupo de clase' section and no challengeId/classGroupId controls", async () => {
    renderEdit();

    expect(await screen.findByDisplayValue("Proyecto Agua Limpia")).toBeInTheDocument();
    expect(screen.queryByText("Reto")).not.toBeInTheDocument();
    expect(screen.queryByText("Grupo de clase")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar un docente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Grupo de clase" })).not.toBeInTheDocument();
  });
});

describe("EditProject — required-field validation", () => {
  it("blocks submission with an empty required field and shows the error", async () => {
    const user = userEvent.setup();
    renderEdit();

    const nameInput = await screen.findByDisplayValue("Proyecto Agua Limpia");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText("Completa este campo")).toBeInTheDocument();
    expect(api.updateProjectRequest).not.toHaveBeenCalled();
  });

  it("submits the updated values (without challengeId/classGroupId) once valid", async () => {
    vi.mocked(api.updateProjectRequest).mockResolvedValue(projectFixture());
    const user = userEvent.setup();
    renderEdit();

    const nameInput = await screen.findByDisplayValue("Proyecto Agua Limpia");
    await user.clear(nameInput);
    await user.type(nameInput, "Proyecto Agua Renovada");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(api.updateProjectRequest).toHaveBeenCalledWith("test-token", 5, {
        name: "Proyecto Agua Renovada",
        description: "Descripción del proyecto",
        problemStatement: "La problemática",
        objectives: "Los objetivos",
        sdgIds: [],
        categoryIds: [1],
        visibility: "PUBLIC",
      });
    });
  });
});
