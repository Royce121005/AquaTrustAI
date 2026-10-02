import { ApiErrorPayload } from '../types';

export const TOKEN_STORAGE_KEY = 'aquatrust_token';

export class ApiClientError extends Error {
  public status: number;
  public statusText: string;
  public errorCode: string;
  public details?: unknown;
  public requestId?: string;

  constructor(status: number, statusText: string, payload?: ApiErrorPayload, rawBody?: string) {
    let resolvedMessage = `HTTP ${status}: ${statusText}`;
    let resolvedCode = 'UNKNOWN_ERROR';
    let resolvedDetails: unknown = undefined;
    let resolvedRequestId: string | undefined = undefined;

    if (payload) {
      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        resolvedMessage = payload.message;
      } else if (typeof payload.detail === 'string') {
        resolvedMessage = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        resolvedMessage = payload.detail.map((d) => d.msg).join(', ');
      }

      if (payload.error_code) {
        resolvedCode = payload.error_code;
      }
      resolvedDetails = payload.details ?? payload.detail;
      resolvedRequestId = payload.request_id;
    } else if (rawBody) {
      resolvedMessage = rawBody;
    }

    super(resolvedMessage);
    this.name = 'ApiClientError';
    this.status = status;
    this.statusText = statusText;
    this.errorCode = resolvedCode;
    this.details = resolvedDetails;
    this.requestId = resolvedRequestId;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isUnprocessable(): boolean {
    return this.status === 422;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
  get isServerError(): boolean {
    return this.status === 500;
  }
  get isServiceUnavailable(): boolean {
    return this.status === 503;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:8000/api/v1';
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Global listener for 401 unauthorized to decouple client from UI router
type UnauthorizedListener = () => void;
const unauthorizedListeners: Set<UnauthorizedListener> = new Set();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized() {
  setStoredToken(null);
  unauthorizedListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in onUnauthorized listener', e);
    }
  });
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let urlStr = `${baseUrl}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const query = searchParams.toString();
    if (query) {
      urlStr += (urlStr.includes('?') ? '&' : '?') + query;
    }
  }

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(urlStr, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiClientError(0, 'Network Error', {
      error_code: 'NETWORK_ERROR',
      message: netErr?.message || 'Unable to connect to AquaTrustAI backend service.',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401) {
      notifyUnauthorized();
    }

    let errorPayload: ApiErrorPayload | undefined;
    let rawText = '';
    try {
      if (isJson) {
        errorPayload = (await response.json()) as ApiErrorPayload;
      } else {
        rawText = await response.text();
      }
    } catch {
      // ignore parse failure
    }

    // Extract request-id header if available
    const reqId = response.headers.get('x-request-id');
    if (errorPayload && reqId && !errorPayload.request_id) {
      errorPayload.request_id = reqId;
    }

    throw new ApiClientError(response.status, response.statusText, errorPayload, rawText);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
