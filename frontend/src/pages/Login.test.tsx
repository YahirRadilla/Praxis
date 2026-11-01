import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import Login from "./Login";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return { ...actual, loginRequest: vi.fn() };
});

describe("Login", () => {
  beforeEach(() => {
    vi.mocked(api.loginRequest).mockReset();
  });

  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findAllByText("Completa este campo")).toHaveLength(2);
    expect(api.loginRequest).not.toHaveBeenCalled();
  });

  it("shows an email-format error for an invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText("tu@institucion.edu"), "not-an-email");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText("Ingresa un correo válido")).toBeInTheDocument();
    expect(api.loginRequest).not.toHaveBeenCalled();
  });

  it("calls loginRequest with the typed email/password on submit", async () => {
    vi.mocked(api.loginRequest).mockResolvedValue({
      user: {
        id: 1,
        email: "estudiante@uabcs.mx",
        name: "Estudiante",
        accountType: "STUDENT",
        skills: [],
        interests: [],
        verified: true,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        academicProgram: null,
      },
      token: "jwt-token",
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText("tu@institucion.edu"), "estudiante@uabcs.mx");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(api.loginRequest).toHaveBeenCalledWith(
        { email: "estudiante@uabcs.mx", password: "secret123" },
        expect.anything(),
      );
    });
  });
});
