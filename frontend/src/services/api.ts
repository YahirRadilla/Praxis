import type { AuthResponse, LoginPayload, RegisterPayload } from "../types/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorResponse(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ApiError(
    body?.message ?? `La API respondió ${res.status}`,
    res.status,
    body?.issues,
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.issues?.[0]?.message ?? error.message;
  }
  return fallback;
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`API respondió ${res.status}`);
  }
  return res.json();
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return parseErrorResponse(res);
  return res.json();
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return parseErrorResponse(res);
  return res.json();
}
