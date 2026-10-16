'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LAYOUT, isLayoutId, type LayoutId } from '@/domain/enums/layout';

/**
 * The user's workspace-shell preference — one source of truth.
 *
 * Persistence follows the pattern `I18nProvider` established: a `steelforce-*`
 * localStorage key, written on change. Reading is different, though. The locale
 * can afford to settle after mount; a layout cannot, because the whole shell
 * would visibly swap. So the value is read from `<html data-layout>`, which the
 * inline script in `app/layout.tsx` sets before first paint.
 *
 * This context holds a preference. It holds no navigation, no session and no
 * business state — a shell reads those from the same places every other part of
 * the app does.
 */

export const LAYOUT_STORAGE_KEY = 'steelforce-layout';

interface LayoutContextValue {
  layout: LayoutId;
  setLayout: (id: LayoutId) => void;
  /** False until the browser value has been adopted; shells may skip animating. */
  isHydrated: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

/** Reads what the pre-paint script resolved, falling back to storage. */
function readLayout(): LayoutId {
  if (typeof document === 'undefined') return DEFAULT_LAYOUT;
  const fromDom = document.documentElement.dataset.layout;
  if (isLayoutId(fromDom)) return fromDom;
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (isLayoutId(stored)) return stored;
  } catch {
    // Private-mode storage failures fall through to the default.
  }
  return DEFAULT_LAYOUT;
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  // The initializer runs on the client with the DOM already carrying the
  // resolved layout, so the first shell painted is the right one. On the server
  // it is the default, which is safe: everything below sits behind `AuthGuard`,
  // which renders the splash on both sides of hydration.
  const [layout, setLayoutState] = useState<LayoutId>(readLayout);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setLayoutState(readLayout());
    setIsHydrated(true);
  }, []);

  const setLayout = useCallback((id: LayoutId) => {
    setLayoutState(id);
    document.documentElement.dataset.layout = id;
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, id);
    } catch {
      // The choice still applies to this session even if it can't be stored.
    }
  }, []);

  const value = useMemo<LayoutContextValue>(
    () => ({ layout, setLayout, isHydrated }),
    [layout, setLayout, isHydrated]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider');
  return ctx;
}
