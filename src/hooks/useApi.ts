'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  /** Re-run the fetcher (e.g. after a mutation or retry). */
  refetch: () => void;
}

/**
 * Declarative GET hook. Pass a fetcher and a dependency list; the hook runs it
 * on mount and whenever deps change. Gives you loading/error for skeletons.
 *
 *   const { data, loading, error } = useQuery(() => api.get<Matter>(`/matter/${id}`), [id]);
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): QueryState<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [tick, setTick] = useState(0);

  // Keep the latest fetcher without forcing it into the dep array.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    fetcherRef.current()
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err : new Error('Request failed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  return { data, loading, error, refetch };
}

export interface MutationState<T, V> {
  mutate: (vars: V) => Promise<T>;
  loading: boolean;
  error: ApiError | Error | null;
  data: T | null;
  reset: () => void;
}

/**
 * Imperative mutation hook (POST/PUT/DELETE).
 *   const { mutate, loading } = useMutation((body) => api.post('/consultations', body));
 *   await mutate({ matterId, advocateId });
 */
export function useMutation<T, V = void>(
  fn: (vars: V) => Promise<T>,
): MutationState<T, V> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = useCallback(async (vars: V): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(vars);
      setData(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Request failed');
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}

/** Pull a friendly message out of any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
