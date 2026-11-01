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
    verifyAccountWithGoogleRequest: vi.fn(),
  };
});

// Captures the callback GoogleVerifyButton passes to `initialize` so a test
// can invoke it directly, simulating Google's own script calling back with
// a credential — there's no real Google script loaded in jsdom.
let capturedGoogleCallback: ((response: { credential: string }) => void) | null = null;
const googleInitialize = vi.fn((config: { callback: (response: { credential: string }) => void }) => {
  capturedGoogleCallback = config.callback;
});
const googleRenderButton = vi.fn();

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
  vi.mocked(api.verifyAccountWithGoogleRequest).mockReset();
  googleInitialize.mockClear();
  googleRenderButton.mockClear();
  capturedGoogleCallback = null;
  (window as unknown as { google: unknown }).google = {
    accounts: { id: { initialize: googleInitialize, renderButton: googleRenderButton } },
  };
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

describe("EditProfile — Google account verification", () => {
  it("shows the Google verify button for an unverified STUDENT", () => {
    seedAuth({ accountType: "STUDENT", verified: false });
    renderProfile();

    expect(googleInitialize).toHaveBeenCalled();
    expect(googleRenderButton).toHaveBeenCalled();
    expect(screen.queryByText("Cuenta verificada ✓")).not.toBeInTheDocument();
  });

  it("shows the Google verify button for an unverified TEACHER", () => {
    seedAuth({ accountType: "TEACHER", verified: false });
    renderProfile();

    expect(googleInitialize).toHaveBeenCalled();
  });

  it("shows no verification section for an ORGANIZATION account", () => {
    seedAuth({ accountType: "ORGANIZATION", verified: false });
    renderProfile();

    expect(googleInitialize).not.toHaveBeenCalled();
    expect(screen.queryByText("Cuenta verificada ✓")).not.toBeInTheDocument();
  });

  it("shows no verification section for an INDEPENDENT account", () => {
    seedAuth({ accountType: "INDEPENDENT", verified: false });
    renderProfile();

    expect(googleInitialize).not.toHaveBeenCalled();
    expect(screen.queryByText("Cuenta verificada ✓")).not.toBeInTheDocument();
  });

  it("shows a verified badge instead of the button when already verified", () => {
    seedAuth({ accountType: "STUDENT", verified: true });
    renderProfile();

    expect(screen.getByText("Cuenta verificada ✓")).toBeInTheDocument();
    expect(googleInitialize).not.toHaveBeenCalled();
  });

  it("verifies the account and swaps the button for the verified badge on success", async () => {
    seedAuth({ accountType: "STUDENT", verified: false });
    vi.mocked(api.verifyAccountWithGoogleRequest).mockResolvedValue(
      buildAuthUser({ accountType: "STUDENT", verified: true, verifiedAt: new Date().toISOString() }),
    );

    renderProfile();
    expect(capturedGoogleCallback).toBeTruthy();

    capturedGoogleCallback?.({ credential: "fake-id-token" });

    await waitFor(() =>
      expect(api.verifyAccountWithGoogleRequest).toHaveBeenCalledWith("test-token", "fake-id-token"),
    );
    expect(await screen.findByText("Cuenta verificada ✓")).toBeInTheDocument();
  });
});
