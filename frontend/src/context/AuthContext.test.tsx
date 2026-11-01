import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { buildAuthUser } from "../test-utils";
import type { AuthResponse } from "../types/auth";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  it("starts unauthenticated when localStorage has no stored session", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it("hydrates from a previously stored session", () => {
    const auth: AuthResponse = { user: buildAuthUser({ name: "Previamente logueado" }), token: "abc" };
    localStorage.setItem("praxis_auth", JSON.stringify(auth));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe("Previamente logueado");
    expect(result.current.token).toBe("abc");
  });

  it("setAuth persists the session and flips isAuthenticated", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const auth: AuthResponse = { user: buildAuthUser(), token: "new-token" };

    act(() => {
      result.current.setAuth(auth);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("new-token");
    expect(JSON.parse(localStorage.getItem("praxis_auth")!)).toEqual(auth);
  });

  it("clearAuth removes the stored session and resets state", () => {
    const auth: AuthResponse = { user: buildAuthUser(), token: "token-to-clear" };
    localStorage.setItem("praxis_auth", JSON.stringify(auth));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.clearAuth();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("praxis_auth")).toBeNull();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth debe usarse dentro de <AuthProvider>",
    );
  });
});
