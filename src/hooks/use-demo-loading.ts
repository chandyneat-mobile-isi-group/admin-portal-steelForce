'use client';

import { useEffect, useState } from 'react';

/**
 * Holds a short "loading" window on mount so the skeleton states are actually
 * seen. The data itself is local and synchronous — this is presentation only.
 */
export function useDemoLoading(ms = 520): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);

  return loading;
}
