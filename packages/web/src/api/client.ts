const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://powerful-embrace-production-95ea.up.railway.app';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...fetchOptions, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get:   <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post:  <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),
  del:   <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
};
