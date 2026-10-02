import type { AnyRecord } from '../types';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'aquatrust.access_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) { super(message); this.name = 'ApiError'; this.status = status; this.detail = detail; }
}
export async function api<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...init, headers }); }
  catch { throw new ApiError('Backend unavailable. Check the API URL and backend status.', 0); }
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const record = body && typeof body === 'object' ? body as AnyRecord : {};
    const detail = record.detail ?? body;
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${response.status})`, response.status, detail);
  }
  return body as T;
}
export const get = <T,>(path: string, auth = true) => api<T>(path, {}, auth);
export const post = <T,>(path: string, body: unknown, auth = true) => api<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth);
export const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  const result = search.toString(); return result ? `?${result}` : '';
};
