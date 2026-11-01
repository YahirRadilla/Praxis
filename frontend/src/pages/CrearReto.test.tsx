import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import CrearReto from "./CrearReto";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listSdgsRequest: vi.fn(),
    listCategoriesRequest: vi.fn(),
    createChallengeRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

const SDGS = [{ id: 1, name: "Fin de la pobreza", colorHex: "#E5243B" }];
const CATEGORIES = [{ id: 1, name: "Tecnología", colorHex: "#123456", icon: "code" }];

beforeEach(() => {
  vi.mocked(api.listSdgsRequest).mockResolvedValue(SDGS);
  vi.mocked(api.listCategoriesRequest).mockResolvedValue(CATEGORIES);
  vi.mocked(api.createChallengeRequest).mockReset();
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  seedAuth({ accountType: "ORGANIZATION" });
});

describe("CrearReto — requires at least one ODS or category", () => {
  it("blocks submission and shows the combined error when neither is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CrearReto />);

    await user.type(screen.getByLabelText(/título del reto/i), "Reto de agua");
    await user.type(screen.getByLabelText(/descripción/i), "Descripción del reto");
    await user.click(screen.getByRole("button", { name: /publicar reto/i }));

    expect(
      await screen.findByText("Selecciona al menos un ODS o una categoría"),
    ).toBeInTheDocument();
    expect(api.createChallengeRequest).not.toHaveBeenCalled();
  });

  it("allows submission once a single ODS is picked", async () => {
    vi.mocked(api.createChallengeRequest).mockResolvedValue({
      id: 1,
      title: "Reto de agua",
      description: "Descripción del reto",
      deadline: null,
      createdAt: new Date().toISOString(),
      organizationId: 1,
      organization: { id: 1, name: "Org", accountType: "ORGANIZATION", email: "org@uabcs.mx" },
      sdgs: [],
      categories: [],
      projects: [],
    });

    const user = userEvent.setup();
    renderWithProviders(<CrearReto />);

    await user.type(screen.getByLabelText(/título del reto/i), "Reto de agua");
    await user.type(screen.getByLabelText(/descripción/i), "Descripción del reto");
    await screen.findByTitle("Fin de la pobreza");
    await user.click(screen.getByTitle("Fin de la pobreza"));
    await user.click(screen.getByRole("button", { name: /publicar reto/i }));

    await waitFor(() => {
      expect(api.createChallengeRequest).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ title: "Reto de agua", sdgIds: [1] }),
      );
    });
  });
});
