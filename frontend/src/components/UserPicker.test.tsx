import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import UserPicker from "./UserPicker";
import * as api from "../services/api";
import type { ProjectPersonRef } from "../types/project";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    searchUsersRequest: vi.fn(),
  };
});

const DOCENTE: ProjectPersonRef = { id: 9, name: "Profa. García", email: "garcia@uabcs.mx", accountType: "TEACHER" };

function ControlledUserPicker() {
  const [value, setValue] = useState<ProjectPersonRef | null>(null);
  return (
    <UserPicker
      accountType="TEACHER"
      label="Buscar persona"
      placeholder="Nombre o correo del docente"
      value={value}
      onChange={setValue}
    />
  );
}

beforeEach(() => {
  vi.mocked(api.searchUsersRequest).mockResolvedValue([]);
  seedAuth({ accountType: "STUDENT" });
});

describe("UserPicker — search and select", () => {
  it("searches as the user types and selects a result", async () => {
    vi.mocked(api.searchUsersRequest).mockResolvedValue([DOCENTE]);
    const user = userEvent.setup();
    renderWithProviders(<ControlledUserPicker />);

    await user.click(screen.getByRole("button", { name: /Nombre o correo del docente/i }));
    await user.type(screen.getByPlaceholderText("Buscar por nombre o correo"), "García");

    await waitFor(() =>
      expect(api.searchUsersRequest).toHaveBeenCalledWith("test-token", {
        accountType: "TEACHER",
        q: "García",
      }),
    );

    await user.click(await screen.findByText("Profa. García"));

    expect(screen.getByRole("button", { name: /Profa\. García/i })).toBeInTheDocument();
  });

  it("clears the selection via 'Quitar selección'", async () => {
    vi.mocked(api.searchUsersRequest).mockResolvedValue([DOCENTE]);
    const user = userEvent.setup();
    renderWithProviders(<ControlledUserPicker />);

    await user.click(screen.getByRole("button", { name: /Nombre o correo del docente/i }));
    await user.click(await screen.findByText("Profa. García"));
    expect(screen.getByRole("button", { name: /Profa\. García/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Profa\. García/i }));
    await user.click(screen.getByRole("button", { name: "Quitar selección" }));

    expect(screen.getByRole("button", { name: /Nombre o correo del docente/i })).toBeInTheDocument();
  });
});
