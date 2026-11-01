import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import type { AuthResponse, AuthUser } from "./types/auth";

const AUTH_STORAGE_KEY = "praxis_auth";

/** A fresh, retry-disabled QueryClient per test so failed mock requests
 * resolve/reject immediately instead of retrying for seconds. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function buildAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    email: "estudiante@uabcs.mx",
    name: "Estudiante Prueba",
    accountType: "STUDENT",
    skills: [],
    interests: [],
    verified: true,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
    academicProgram: null,
    ...overrides,
  };
}

/** AuthProvider reads this synchronously on mount, so call before rendering. */
export function seedAuth(overrides: Partial<AuthUser> = {}, token = "test-token"): AuthResponse {
  const auth: AuthResponse = { user: buildAuthUser(overrides), token };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  return auth;
}

export function clearSeededAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { route = "/", queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from "@testing-library/react";
