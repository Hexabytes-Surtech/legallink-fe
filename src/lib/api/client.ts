/**
 * LegalLink API Client
 * Handles: base URL injection, auth header, response envelope unwrapping,
 * and typed error surfacing.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

interface RequestOptions<B = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: B;
  skipAuth?: boolean;
  formData?: FormData;
}

export async function apiClient<T = unknown, B = unknown>(
  path: string,
  options: RequestOptions<B> = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, skipAuth = false, formData } = options;

  const headers: Record<string, string> = {};

  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('ll_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (formData) {
    init.body = formData;
    delete headers['Content-Type'];
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, init);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: json?.message ?? json?.error ?? `HTTP ${res.status}`,
        statusCode: res.status,
      };
    }

    if ('success' in json && 'data' in json) {
      return json as ApiResponse<T>;
    }

    return { success: true, data: json as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, data: null, error: message };
  }
}