import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import Explore from "./Explore";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    searchProjectsRequest: vi.fn(),
    listSdgsRequest: vi.fn(),
    listCategoriesRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const SDGS = [{ id: 1, name: "Fin de la pobreza", colorHex: "#E5243B" }];
const CATEGORIES = [{ id: 1, name: "Tecnología", colorHex: "#123456", icon: "code" }];

beforeEach(() => {
  vi.mocked(api.searchProjectsRequest).mockResolvedValue([]);
  vi.mocked(api.listSdgsRequest).mockResolvedValue(SDGS);
  vi.mocked(api.listCategoriesRequest).mockResolvedValue(CATEGORIES);
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
});

function lastSearchCall() {
  const calls = vi.mocked(api.searchProjectsRequest).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe("Explore — search syncs to ?q=", () => {
  it("typing in the search box updates the ?q= URL param and re-queries with it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Explore />, { route: "/explorar" });

    await user.type(
      screen.getByPlaceholderText("Buscar proyectos por nombre o descripción"),
      "agua",
    );

    await waitFor(() => expect(lastSearchCall()?.q).toBe("agua"));
  });

  it("reads an initial ?q= from the URL into the search box", () => {
    renderWithProviders(<Explore />, { route: "/explorar?q=limpieza" });

    expect(
      screen.getByPlaceholderText("Buscar proyectos por nombre o descripción"),
    ).toHaveValue("limpieza");
  });
});

describe("Explore — category and ODS filters", () => {
  it("applies a category filter once checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Explore />, { route: "/explorar" });

    await user.click(screen.getByRole("button", { name: /Todas las categorías/i }));
    await user.click(screen.getByRole("checkbox", { name: /Tecnología/i }));

    await waitFor(() => expect(lastSearchCall()?.categoryIds).toEqual([1]));
    expect(screen.getByRole("button", { name: /1 categoría seleccionada/i })).toBeInTheDocument();
  });

  it("applies an ODS filter once checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Explore />, { route: "/explorar" });

    await user.click(screen.getByRole("button", { name: /Todos los ODS/i }));
    await user.click(screen.getByRole("checkbox", { name: /Fin de la pobreza/i }));

    await waitFor(() => expect(lastSearchCall()?.sdgIds).toEqual([1]));
    expect(screen.getByRole("button", { name: /1 ODS seleccionado/i })).toBeInTheDocument();
  });
});
