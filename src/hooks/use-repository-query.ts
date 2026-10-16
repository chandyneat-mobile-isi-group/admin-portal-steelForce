'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RepositoryQueryState<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  isRefreshing: boolean;
  refetch: () => void;
}

/**
 * Small dependency-free server-state seam for repositories. It handles
 * cancellation and stale responses now; it can be replaced by TanStack Query
 * later without changing repository contracts or feature models.
 */
export function useRepositoryQuery<T>(
  key: readonly unknown[],
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true
): RepositoryQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const initialLoad = useRef(true);
  const keyValue = JSON.stringify(key);

  const refetch = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const isInitial = initialLoad.current;
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    load(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setData(next);
      })
      .catch((nextError) => {
        if (!controller.signal.aborted) setError(nextError);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
          initialLoad.current = false;
        }
      });

    return () => controller.abort();
  }, [enabled, keyValue, load, revision]);

  return { data, error, isLoading, isRefreshing, refetch };
}
