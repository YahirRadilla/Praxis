import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import MisGruposClase from "./MisGruposClase";
import * as api from "../services/api";
import type { ClassGroup } from "../types/class-group";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    searchClassGroupsRequest: vi.fn(),
    listMyClassGroupsRequest: vi.fn(),
    listJoinedClassGroupsRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const TEACHER = { id: 9, name: "Profa. García", accountType: "TEACHER" };

function classGroupFixture(overrides: Partial<ClassGroup> = {}): ClassGroup {
  return {
    id: 1,
    name: "Grupo de Ingeniería",
    description: "Un grupo de prueba",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    teacherId: TEACHER.id,
    teacher: TEACHER,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.searchClassGroupsRequest).mockResolvedValue([]);
  vi.mocked(api.listMyClassGroupsRequest).mockResolvedValue([]);
  vi.mocked(api.listJoinedClassGroupsRequest).mockResolvedValue([]);
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
});

describe("MisGruposClase — search syncs to ?q=", () => {
  it("typing in the search box updates the ?q= URL param and re-queries with it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MisGruposClase />, { route: "/grupos-clase" });

    await user.type(
      screen.getByPlaceholderText("Buscar grupos de clase por nombre o descripción"),
      "ingeniería",
    );

    await waitFor(() => {
      const calls = vi.mocked(api.searchClassGroupsRequest).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toBe("ingeniería");
    });
  });

  it("reads an initial ?q= from the URL into the search box", () => {
    renderWithProviders(<MisGruposClase />, { route: "/grupos-clase?q=robotica" });

    expect(
      screen.getByPlaceholderText("Buscar grupos de clase por nombre o descripción"),
    ).toHaveValue("robotica");
  });
});

describe("MisGruposClase — teacher vs. student section split", () => {
  it("shows 'Mis grupos' and the create button, not 'Grupos a los que me uní', for a teacher", async () => {
    seedAuth({ accountType: "TEACHER" });
    vi.mocked(api.listMyClassGroupsRequest).mockResolvedValue([classGroupFixture()]);
    renderWithProviders(<MisGruposClase />, { route: "/grupos-clase" });

    expect(await screen.findByText("Mis grupos")).toBeInTheDocument();
    expect(screen.queryByText("Grupos a los que me uní")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+ Crear grupo de clase" })).toBeInTheDocument();
  });

  it("shows 'Grupos a los que me uní', not 'Mis grupos' or the create button, for a student", async () => {
    seedAuth({ accountType: "STUDENT" });
    vi.mocked(api.listJoinedClassGroupsRequest).mockResolvedValue([classGroupFixture()]);
    renderWithProviders(<MisGruposClase />, { route: "/grupos-clase" });

    expect(await screen.findByText("Grupos a los que me uní")).toBeInTheDocument();
    expect(screen.queryByText("Mis grupos")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "+ Crear grupo de clase" })).not.toBeInTheDocument();
  });

  it("shows a login prompt and no membership section when unauthenticated", () => {
    renderWithProviders(<MisGruposClase />, { route: "/grupos-clase" });

    expect(
      screen.getByText(/Inicia sesión para unirte a un grupo de clase/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mis grupos")).not.toBeInTheDocument();
    expect(screen.queryByText("Grupos a los que me uní")).not.toBeInTheDocument();
  });
});
