import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import RetoDetalle from "./RetoDetalle";
import * as api from "../services/api";
import type { Challenge } from "../types/challenge";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getChallengeRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const ORG = { id: 1, name: "Fundación Agua", accountType: "ORGANIZATION", email: "org@uabcs.mx" };

function challengeFixture(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 1,
    title: "Reto de agua limpia",
    description: "Necesitamos reducir el consumo de agua potable en la comunidad.",
    deadline: null,
    createdAt: new Date().toISOString(),
    organizationId: ORG.id,
    organization: ORG,
    sdgs: [],
    categories: [],
    projects: [],
    ...overrides,
  };
}

function renderReto(route = "/retos/1") {
  return renderWithProviders(
    <Routes>
      <Route path="/retos/:id" element={<RetoDetalle />} />
      <Route path="/proyectos/nuevo" element={<p>Crear proyecto</p>} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.getChallengeRequest).mockReset();
});

describe("RetoDetalle — loaded state", () => {
  it("renders the challenge's title, description, and deadline placeholder when there's none", async () => {
    vi.mocked(api.getChallengeRequest).mockResolvedValue(challengeFixture());
    renderReto();

    expect(await screen.findByText("Reto de agua limpia")).toBeInTheDocument();
    expect(
      screen.getByText("Necesitamos reducir el consumo de agua potable en la comunidad."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin fecha límite definida")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay proyectos vinculados a este reto.")).toBeInTheDocument();
  });

  it("formats a real deadline and lists linked projects", async () => {
    vi.mocked(api.getChallengeRequest).mockResolvedValue(
      challengeFixture({
        deadline: "2026-12-31T00:00:00.000Z",
        projects: [
          {
            id: 9,
            name: "Proyecto vinculado",
            description: "Descripción del proyecto vinculado",
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
          },
        ],
      }),
    );
    renderReto();

    expect(await screen.findByText("Proyecto vinculado")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay proyectos vinculados a este reto.")).not.toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("navigates to project creation pre-filled with this challenge", async () => {
    vi.mocked(api.getChallengeRequest).mockResolvedValue(challengeFixture());
    const user = userEvent.setup();
    renderReto();

    await user.click(await screen.findByRole("button", { name: "Crear proyecto a partir de este reto" }));
    expect(await screen.findByText("Crear proyecto")).toBeInTheDocument();
  });
});

describe("RetoDetalle — error state", () => {
  it("shows the error message and retries on demand", async () => {
    vi.mocked(api.getChallengeRequest).mockRejectedValueOnce(new Error("network down"));
    vi.mocked(api.getChallengeRequest).mockResolvedValueOnce(challengeFixture());

    const user = userEvent.setup();
    renderReto();

    expect(
      await screen.findByText(/No se pudo cargar este reto/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByText("Reto de agua limpia")).toBeInTheDocument());
  });
});
