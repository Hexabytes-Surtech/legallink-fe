/**
 * LegalLink API client
 * ---------------------------------------------------------------------------
 * Speaks the backend's response envelope exactly:
 *   success: { success: true,  data: <payload>, meta }
 *   error:   { success: false, error: { code, message }, meta }
 *            where `message` may be a string OR string[] (validation errors).
 *
 * Responsibilities:
 *   - inject the access token (Bearer) from localStorage
 *   - always send cookies (anonymous session + refresh token)  -> credentials:'include'
 *   - unwrap `.data` on success
 *   - on 401, transparently refresh the access token once and retry
 *   - surface a typed `ApiError` so the UI can branch on status codes
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// localStorage key — must match AuthContext.
const LS_ACCESS = 'll_access_token';

export class ApiError extends Error {
  readonly code: number;
  /** Raw message(s) from the backend — string or string[]. */
  readonly raw: string | string[];

  constructor(code: number, message: string | string[]) {
    super(Array.isArray(message) ? message.join(', ') : message);
    this.name = 'ApiError';
    this.code = code;
    this.raw = message;
  }

  /** First message — handy for inline field errors. */
  get first(): string {
    return Array.isArray(this.raw) ? (this.raw[0] ?? this.message) : this.raw;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<B = unknown> {
  method?: HttpMethod;
  body?: B;
  /** Don't attach the Authorization header (public endpoints). */
  skipAuth?: boolean;
  /** Send multipart/form-data instead of JSON. */
  formData?: FormData;
  /** Extra query params. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Per-request header overrides. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_ACCESS);
}

function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_ACCESS, token);
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

/** Pull a human message out of an error envelope (handles string | string[] | legacy shapes). */
function extractError(json: unknown, status: number): string | string[] {
  if (json && typeof json === 'object') {
    const j = json as Record<string, unknown>;
    // New envelope: { error: { code, message } }
    if (j.error && typeof j.error === 'object') {
      const msg = (j.error as Record<string, unknown>).message;
      if (typeof msg === 'string' || Array.isArray(msg)) return msg as string | string[];
    }
    // Fallbacks (legacy / framework defaults)
    if (typeof j.message === 'string' || Array.isArray(j.message)) return j.message as string | string[];
    if (typeof j.error === 'string') return j.error;
  }
  return `Request failed (HTTP ${status})`;
}

// Single-flight refresh so concurrent 401s don't fire many refreshes.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh-token'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success && json?.data?.accessToken) {
        setToken(json.data.accessToken);
        return json.data.accessToken as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      // allow next refresh after this settles
      setTimeout(() => (refreshInFlight = null), 0);
    }
  })();
  return refreshInFlight;
}

async function coreFetch<T>(path: string, options: RequestOptions, isRetry = false): Promise<T> {
  const { method = 'GET', body, skipAuth = false, formData, query, headers = {}, signal } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  if (!formData) finalHeaders['Content-Type'] = 'application/json';

  if (!skipAuth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers: finalHeaders, credentials: 'include', signal };
  if (formData) init.body = formData;
  else if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(buildUrl(path, query), init);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Transparent refresh-and-retry on 401 (once), except for the auth endpoints themselves.
    const isAuthCall = path.startsWith('/auth/');
    if (res.status === 401 && !isRetry && !skipAuth && !isAuthCall) {
      const fresh = await refreshAccessToken();
      if (fresh) return coreFetch<T>(path, options, true);
    }
    throw new ApiError(res.status, extractError(json, res.status));
  }

  // Success — unwrap the envelope's `.data`.
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * Primary client. Resolves to the unwrapped `data`, throws `ApiError` on failure.
 *   const matter = await api.post<MatterDetail>('/matter', { query, language });
 */
export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T, B = unknown>(path: string, body?: B, opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'POST', body }),
  put: <T, B = unknown>(path: string, body?: B, opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T, B = unknown>(path: string, body?: B, opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts: Omit<RequestOptions, 'method'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'DELETE' }),
  /** multipart upload helper. */
  upload: <T>(path: string, formData: FormData, opts: Omit<RequestOptions, 'method' | 'formData' | 'body'> = {}) =>
    coreFetch<T>(path, { ...opts, method: 'POST', formData }),
};

/**
 * SSE streaming POST. Parses `event:`/`data:` blocks and calls `onEvent(event, data)`
 * for each. Resolves when the stream ends; throws ApiError on a non-OK response.
 * Sends the Bearer token + session cookie just like the rest of the client.
 * Used by the Perplexity-style chat (agent steps + sources + streamed answer).
 */
export async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new ApiError(res.status, extractError(json, res.status));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data) {
        try {
          onEvent(event, JSON.parse(data));
        } catch {
          /* ignore malformed event */
        }
      }
    }
  }
}

/**
 * Legacy result-shape wrapper — never throws. Returns a discriminated result.
 * Useful where you want to render an inline error without a try/catch.
 */
export interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  /** First message only, convenient for forms. */
  errorFirst?: string;
  statusCode?: number;
}

export async function apiClient<T = unknown, B = unknown>(
  path: string,
  options: RequestOptions<B> = {},
): Promise<ApiResult<T>> {
  try {
    const data = await coreFetch<T>(path, options);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, data: null, error: err.message, errorFirst: err.first, statusCode: err.code };
    }
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, data: null, error: message };
  }
}
