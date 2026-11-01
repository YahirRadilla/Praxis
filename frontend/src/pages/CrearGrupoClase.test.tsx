import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import CrearGrupoClase from "./CrearGrupoClase";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    createClassGroupRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(api.createClassGroupRequest).mockReset();
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  seedAuth({ accountType: "TEACHER" });
});

describe("CrearGrupoClase — required-field validation", () => {
  it("shows required-field errors and blocks submission when the form is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CrearGrupoClase />);

    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    expect((await screen.findAllByText("Completa este campo")).length).toBe(2);
    expect(api.createClassGroupRequest).not.toHaveBeenCalled();
  });

  it("submits the entered name/description once filled in", async () => {
    vi.mocked(api.createClassGroupRequest).mockResolvedValue({
      id: 1,
      name: "Grupo de Ingeniería",
      description: "desc",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherId: 9,
      teacher: { id: 9, name: "Profa. García", accountType: "TEACHER" },
    });

    const user = userEvent.setup();
    renderWithProviders(<CrearGrupoClase />);

    await user.type(screen.getByLabelText("Nombre del grupo"), "Grupo de Ingeniería");
    await user.type(screen.getByLabelText("Descripción"), "desc");
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(api.createClassGroupRequest).toHaveBeenCalledWith("test-token", {
        name: "Grupo de Ingeniería",
        description: "desc",
      });
    });
  });
});
