import { describe, expect, it, vi, beforeEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import GrupoClaseDetalle from "./GrupoClaseDetalle";
import * as api from "../services/api";
import type { ClassGroup } from "../types/class-group";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getClassGroupRequest: vi.fn(),
    listClassGroupMembersRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const TEACHER = { id: 9, name: "Profa. García", accountType: "TEACHER" };

function classGroupFixture(overrides: Partial<ClassGroup>): ClassGroup {
  return {
    id: 5,
    name: "Grupo de Ingeniería",
    description: "Un grupo de prueba",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    teacherId: TEACHER.id,
    teacher: TEACHER,
    ...overrides,
  };
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/grupos-clase/:id" element={<GrupoClaseDetalle />} />
    </Routes>,
    { route: "/grupos-clase/5" },
  );
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.listClassGroupMembersRequest).mockReset();
  seedAuth({ accountType: "STUDENT" });
});

describe("GrupoClaseDetalle — preview tier (not joined, can join)", () => {
  it("shows the join prompt and hides resources/projects sections", async () => {
    vi.mocked(api.getClassGroupRequest).mockResolvedValue(
      classGroupFixture({ viewer: { isOwner: false, isMember: false, canJoin: true } }),
    );
    renderDetail();

    expect(await screen.findByText(/Únete a este grupo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unirme" })).toBeInTheDocument();
    expect(screen.queryByText("Documentos")).not.toBeInTheDocument();
    expect(screen.queryByText("Proyectos de este grupo")).not.toBeInTheDocument();
    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();
  });
});

describe("GrupoClaseDetalle — member tier", () => {
  it("shows resources/projects but hides add/delete resource controls and the Miembros section", async () => {
    vi.mocked(api.getClassGroupRequest).mockResolvedValue(
      classGroupFixture({
        viewer: { isOwner: false, isMember: true, canJoin: false },
        resources: [
          {
            id: 1,
            classGroupId: 5,
            creatorId: 9,
            type: "LINK",
            url: "https://example.com",
            fileName: null,
            mimeType: null,
            sizeBytes: null,
            label: "Rúbrica",
            description: null,
            createdAt: new Date().toISOString(),
            creator: { id: 9, name: "Profa. García" },
          },
        ],
        projects: [],
      }),
    );
    renderDetail();

    expect(await screen.findByText("Documentos")).toBeInTheDocument();
    expect(screen.getByText("Proyectos de este grupo")).toBeInTheDocument();
    expect(screen.getByText("Rúbrica")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Agregar documento" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Borrar documento")).not.toBeInTheDocument();
    expect(screen.queryByText("Miembros")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Salir del grupo" })).toBeInTheDocument();
  });
});

describe("GrupoClaseDetalle — owner tier", () => {
  it("shows the Miembros section and the add/delete resource controls", async () => {
    vi.mocked(api.getClassGroupRequest).mockResolvedValue(
      classGroupFixture({
        viewer: { isOwner: true, isMember: false, canJoin: false },
        resources: [],
        projects: [],
      }),
    );
    vi.mocked(api.listClassGroupMembersRequest).mockResolvedValue([
      {
        classGroupId: 5,
        userId: 20,
        joinedAt: new Date().toISOString(),
        user: { id: 20, name: "Estudiante Uno", email: "e1@uabcs.mx", accountType: "STUDENT" },
      },
    ]);
    renderDetail();

    expect(await screen.findByText("Miembros")).toBeInTheDocument();
    expect(await screen.findByText("Estudiante Uno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar documento" })).toBeInTheDocument();

    // Owners don't get a "Salir del grupo" button (isMember && !isOwner is false here).
    expect(screen.queryByRole("button", { name: "Salir del grupo" })).not.toBeInTheDocument();

    await waitFor(() => expect(api.listClassGroupMembersRequest).toHaveBeenCalledWith(5, "test-token"));
  });
});
