import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import CreateProject from "./CreateProject";
import * as api from "../services/api";
import type { Challenge } from "../types/challenge";
import type { ClassGroup } from "../types/class-group";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listSdgsRequest: vi.fn(),
    listCategoriesRequest: vi.fn(),
    createProjectRequest: vi.fn(),
    getChallengeRequest: vi.fn(),
    getClassGroupRequest: vi.fn(),
    searchUsersRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const SECTION_LABELS = [
  "Información del proyecto",
  "Categorías",
  "Objetivos de Desarrollo Sostenible",
  "Reto",
  "Grupo de clase",
  "Visibilidad",
];

function activeAnchor() {
  return SECTION_LABELS.map((label) => screen.getByRole("link", { name: label })).find((a) =>
    a.className.includes("text-accent-primary"),
  );
}

const SDGS = [
  { id: 1, name: "Fin de la pobreza", colorHex: "#E5243B" },
  { id: 4, name: "Educación de calidad", colorHex: "#C5192D" },
];
const CATEGORIES = [{ id: 1, name: "Tecnología", colorHex: "#123456", icon: "code" }];

beforeEach(() => {
  // jsdom lays out every element at (0, 0): without this, CreateProject's
  // scroll-position heuristic (which also runs once on mount) would see
  // every section "above the fold" and pick the last one, masking the
  // click-driven `setActiveSection` behavior under test below.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 9999,
    bottom: 9999,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    },
  } as DOMRect);
  vi.mocked(api.listSdgsRequest).mockResolvedValue(SDGS);
  vi.mocked(api.listCategoriesRequest).mockResolvedValue(CATEGORIES);
  vi.mocked(api.searchUsersRequest).mockResolvedValue([]);
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.getChallengeRequest).mockReset();
  vi.mocked(api.getClassGroupRequest).mockReset();
  vi.mocked(api.createProjectRequest).mockReset();
  seedAuth({ accountType: "STUDENT" });
});

describe("CreateProject — section nav click-to-highlight", () => {
  it("clicking each of the 6 nav tabs marks exactly that tab active", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProject />, { route: "/proyectos/nuevo" });

    // "Información del proyecto" is active by default.
    expect(activeAnchor()?.textContent).toBe("Información del proyecto");

    for (const label of SECTION_LABELS) {
      await user.click(screen.getByRole("link", { name: label }));
      const active = activeAnchor();
      expect(active?.textContent).toBe(label);
      // Exactly one tab should carry the active styling at a time.
      const activeCount = SECTION_LABELS.filter((other) =>
        screen.getByRole("link", { name: other }).className.includes("text-accent-primary"),
      ).length;
      expect(activeCount).toBe(1);
    }
  });
});

describe("CreateProject — classGroupId query-param prefill", () => {
  it("loads the linked class group and shows the informational note instead of the Docente picker", async () => {
    const classGroup: ClassGroup = {
      id: 5,
      name: "Grupo de Ingeniería",
      description: "desc",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherId: 9,
      teacher: { id: 9, name: "Profa. García", accountType: "TEACHER" },
    };
    vi.mocked(api.getClassGroupRequest).mockResolvedValue(classGroup);

    renderWithProviders(<CreateProject />, { route: "/proyectos/nuevo?classGroupId=5" });

    await waitFor(() => expect(api.getClassGroupRequest).toHaveBeenCalledWith(5, "test-token"));

    expect(
      await screen.findByText(/Profa\. García quedará vinculado como evaluador/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar un docente" })).not.toBeInTheDocument();

    expect(screen.getByText("Grupo de Ingeniería")).toBeInTheDocument();
  });

  it("shows the Docente picker (not the note) when no class group is linked", () => {
    renderWithProviders(<CreateProject />, { route: "/proyectos/nuevo" });
    expect(screen.getByRole("button", { name: "Buscar un docente" })).toBeInTheDocument();
  });
});

describe("CreateProject — challengeId query-param prefill", () => {
  it("pre-fills the ODS selection from the linked Reto's own ODS", async () => {
    const challenge: Partial<Challenge> = {
      id: 7,
      title: "Reto de agua limpia",
      sdgs: [{ challengeId: 7, sdgId: 4, sdg: SDGS[1] }],
    };
    vi.mocked(api.getChallengeRequest).mockResolvedValue(challenge as Challenge);

    renderWithProviders(<CreateProject />, { route: "/proyectos/nuevo?challengeId=7" });

    await screen.findByText("Reto de agua limpia");

    await waitFor(() => {
      const sdgButton = screen.getByTitle("Educación de calidad");
      expect(sdgButton).toHaveAttribute("aria-pressed", "true");
    });
    const otherSdgButton = screen.getByTitle("Fin de la pobreza");
    expect(otherSdgButton).toHaveAttribute("aria-pressed", "false");
  });
});

describe("CreateProject — Zod validation", () => {
  it("shows required-field errors and blocks submission when the form is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProject />, { route: "/proyectos/nuevo" });

    await user.click(screen.getByRole("button", { name: /crear proyecto/i }));

    expect((await screen.findAllByText("Completa este campo")).length).toBeGreaterThanOrEqual(4);
    expect(await screen.findByText("Selecciona al menos una categoría")).toBeInTheDocument();
    expect(api.createProjectRequest).not.toHaveBeenCalled();
  });
});
