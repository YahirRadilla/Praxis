import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth, buildAuthUser } from "../test-utils";
import EditProfile from "./EditProfile";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    updateProfileRequest: vi.fn(),
  };
});

function renderProfile() {
  return renderWithProviders(
    <Routes>
      <Route path="/perfil" element={<EditProfile />} />
      <Route path="/inicio" element={<p>Pantalla de inicio</p>} />
    </Routes>,
    { route: "/perfil" },
  );
}

beforeEach(() => {
  vi.mocked(api.updateProfileRequest).mockReset();
});

describe("EditProfile — pre-fill", () => {
  it("pre-fills the form from the current user's skills and interests", () => {
    seedAuth({ name: "Estudiante Prueba", skills: ["React", "Node.js"], interests: ["Educación"] });
    renderProfile();

    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Estudiante Prueba");
    expect(screen.getByPlaceholderText("React, Node.js, Diseño UX")).toHaveValue("React, Node.js");
    expect(screen.getByPlaceholderText("Educación, Sostenibilidad")).toHaveValue("Educación");
  });
});

describe("EditProfile — submit", () => {
  it("trims and splits comma-separated skills/interests, then redirects on success", async () => {
    seedAuth({ name: "Estudiante Prueba", skills: [], interests: [] });
    vi.mocked(api.updateProfileRequest).mockResolvedValue(
      buildAuthUser({ name: "Estudiante Prueba", skills: ["React", "Diseño UX"], interests: ["Educación"] }),
    );

    const user = userEvent.setup();
    renderProfile();

    const skillsInput = screen.getByPlaceholderText("React, Node.js, Diseño UX");
    await user.clear(skillsInput);
    await user.type(skillsInput, "React,  , Diseño UX ,");
    const interestsInput = screen.getByPlaceholderText("Educación, Sostenibilidad");
    await user.clear(interestsInput);
    await user.type(interestsInput, " Educación ");

    await user.click(screen.getByRole("button", { name: "Guardar perfil" }));

    await waitFor(() =>
      expect(api.updateProfileRequest).toHaveBeenCalledWith("test-token", {
        name: "Estudiante Prueba",
        skills: ["React", "Diseño UX"],
        interests: ["Educación"],
        academicProgram: "",
      }),
    );
    expect(await screen.findByText("Pantalla de inicio")).toBeInTheDocument();
  });

  it("stays on the form when the update fails", async () => {
    seedAuth({ name: "Estudiante Prueba" });
    vi.mocked(api.updateProfileRequest).mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Guardar perfil" }));

    await waitFor(() => expect(api.updateProfileRequest).toHaveBeenCalled());
    expect(screen.getByText("Completa tu perfil")).toBeInTheDocument();
  });
});
