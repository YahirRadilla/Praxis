import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse, AuthUser } from "../types/auth";

const STORAGE_KEY = "praxis_auth";

interface StoredAuth {
  user: AuthUser;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(() => readStoredAuth());

  const value = useMemo<AuthContextValue>(
    () => ({
      user: stored?.user ?? null,
      token: stored?.token ?? null,
      isAuthenticated: stored !== null,
      setAuth: (auth) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setStored(auth);
      },
      clearAuth: () => {
        localStorage.removeItem(STORAGE_KEY);
        setStored(null);
      },
    }),
    [stored],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
