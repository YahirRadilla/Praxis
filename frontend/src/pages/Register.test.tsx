import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import Register from "./Register";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return { ...actual, registerRequest: vi.fn() };
});

const MOCK_AUTH_RESPONSE = {
  user: {
    id: 2,
    email: "nueva@uabcs.mx",
    name: "Nueva Cuenta",
    accountType: "TEACHER" as const,
    skills: [],
    interests: [],
    verified: false,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
    academicProgram: null,
    semester: null,
    cvUrl: null,
  },
  token: "jwt-token",
};

describe("Register", () => {
  beforeEach(() => {
    vi.mocked(api.registerRequest).mockReset();
  });

  it("defaults the account type selector to STUDENT", () => {
    renderWithProviders(<Register />);
    const studentRadio = screen.getByRole("radio", { name: "Estudiante" });
    expect(studentRadio).toBeChecked();
  });

  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    // name + email are empty, and password's "min length 1" check fails
    // before (and with the same message as) its "min length 8" check.
    expect(await screen.findAllByText("Completa este campo")).toHaveLength(3);
    expect(api.registerRequest).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText("Tu nombre"), "Ana");
    await user.type(screen.getByPlaceholderText("tu@institucion.edu"), "ana@uabcs.mx");
    await user.type(screen.getByPlaceholderText("Mínimo 8 caracteres"), "short1");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText("Debe tener al menos 8 caracteres")).toBeInTheDocument();
    expect(api.registerRequest).not.toHaveBeenCalled();
  });

  it("switching the account type selector updates which option is checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.click(screen.getByRole("radio", { name: "Organización" }));

    expect(screen.getByRole("radio", { name: "Organización" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Estudiante" })).not.toBeChecked();
  });

  it("submits the chosen accountType along with name/email/password", async () => {
    vi.mocked(api.registerRequest).mockResolvedValue(MOCK_AUTH_RESPONSE);

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText("Tu nombre"), "Nueva Cuenta");
    await user.type(screen.getByPlaceholderText("tu@institucion.edu"), "nueva@uabcs.mx");
    await user.type(screen.getByPlaceholderText("Mínimo 8 caracteres"), "password123");
    await user.click(screen.getByRole("radio", { name: "Docente" }));
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(api.registerRequest).toHaveBeenCalledWith(
        {
          name: "Nueva Cuenta",
          email: "nueva@uabcs.mx",
          password: "password123",
          accountType: "TEACHER",
        },
        expect.anything(),
      );
    });
  });
});
