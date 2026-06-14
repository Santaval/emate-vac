import { getToken } from "./useAuth";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
