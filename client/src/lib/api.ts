export async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
};
