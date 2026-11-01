import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, getErrorMessage, getHealth, loginRequest } from "./api";

describe("getErrorMessage", () => {
  it("prefers the first Zod issue's message over the generic ApiError message", () => {
    const error = new ApiError("Datos inválidos", 400, [
      { path: "email", message: "El correo no es válido" },
      { path: "password", message: "La contraseña es muy corta" },
    ]);

    expect(getErrorMessage(error, "Fallback")).toBe("El correo no es válido");
  });

  it("falls back to the ApiError's own message when there are no issues", () => {
    const error = new ApiError("Credenciales incorrectas", 401);

    expect(getErrorMessage(error, "Fallback")).toBe("Credenciales incorrectas");
  });

  it("falls back to the ApiError's own message when issues is an empty array", () => {
    const error = new ApiError("Credenciales incorrectas", 401, []);

    expect(getErrorMessage(error, "Fallback")).toBe("Credenciales incorrectas");
  });

  it("uses the provided fallback for a plain network/unknown error", () => {
    expect(getErrorMessage(new TypeError("Failed to fetch"), "No se pudo conectar.")).toBe(
      "No se pudo conectar.",
    );
    expect(getErrorMessage("algo raro", "No se pudo conectar.")).toBe("No se pudo conectar.");
    expect(getErrorMessage(null, "No se pudo conectar.")).toBe("No se pudo conectar.");
  });
});

describe("request() error parsing (via a real request-backed call)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws an ApiError carrying the backend's status, message, and issues on a non-OK response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        message: "Validación fallida",
        issues: [{ path: "name", message: "El nombre es obligatorio" }],
      }),
    } as Response);

    await expect(loginRequest({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Validación fallida",
      issues: [{ path: "name", message: "El nombre es obligatorio" }],
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(loginRequest({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 500,
      message: "La API respondió 500",
    });
  });

  it("getHealth throws a plain Error (not ApiError) on a non-OK response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(getHealth()).rejects.toThrow("API respondió 503");
  });
});
