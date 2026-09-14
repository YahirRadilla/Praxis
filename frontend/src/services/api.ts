const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`API respondió ${res.status}`);
  }
  return res.json();
}
