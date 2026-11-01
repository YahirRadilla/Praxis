import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../test-utils";
import Retos from "./Retos";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listChallengesRequest: vi.fn(),
    listCategoriesRequest: vi.fn(),
    listSdgsRequest: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(api.listChallengesRequest).mockResolvedValue([]);
  vi.mocked(api.listCategoriesRequest).mockResolvedValue([]);
  vi.mocked(api.listSdgsRequest).mockResolvedValue([]);
});

describe("Retos — search syncs to ?q=", () => {
  it("typing in the search box updates the ?q= URL param and re-queries with it", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/retos" element={<Retos />} />
      </Routes>,
      { route: "/retos" },
    );

    await user.type(
      screen.getByPlaceholderText("Buscar retos por título o descripción"),
      "agua",
    );

    await waitFor(() => {
      const calls = vi.mocked(api.listChallengesRequest).mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.q).toBe("agua");
    });
  });

  it("reads an initial ?q= from the URL into the search box", () => {
    renderWithProviders(
      <Routes>
        <Route path="/retos" element={<Retos />} />
      </Routes>,
      { route: "/retos?q=limpieza" },
    );

    expect(screen.getByPlaceholderText("Buscar retos por título o descripción")).toHaveValue(
      "limpieza",
    );
  });
});
