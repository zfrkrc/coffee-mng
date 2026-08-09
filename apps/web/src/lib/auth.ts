export type AuthUser = {
  sub: string;
  email: string;
  role: string;
  services: string[];
  domain: string;
  branch?: {
    id: string;
    slug: string;
    name: string;
    address?: string;
  };
  name: string;
  exp: number;
};

const TOKEN_KEY = 'cafeos-auth-token';

export function saveAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearAuthToken();
  }
  return res;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch('/api/access/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    clearAuthToken();
    return null;
  }
  return (await res.json()) as AuthUser;
}
