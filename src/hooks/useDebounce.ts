'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delay` ms.
 *
 * Used by search inputs so we don't fire a request (and a loading state) on
 * every keystroke — the query runs once the user pauses typing.
 *
 *   const debounced = useDebouncedValue(search, 350);
 *   useQuery(() => api.get('/advocates', { query: { q: debounced } }), [debounced]);
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
