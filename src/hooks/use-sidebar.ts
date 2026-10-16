'use client';

import { resolveActiveNav } from '@/config/navigation';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const COLLAPSE_KEY = 'steelforce-sidebar-collapsed';
const GROUPS_KEY = 'steelforce-sidebar-groups';

/** Collapse state lives in the shell so the header and content can react to it. */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  return { collapsed, toggle, mounted };
}

/**
 * Which groups are open, persisted across restarts.
 *
 * Storage is only read after mount: reading during render would make the
 * server and client markup disagree. The group owning the current route is
 * always forced open, so deep-linking into a child never lands the user on a
 * collapsed parent.
 */
export function useSidebarGroups() {
  const pathname = usePathname();
  const active = useMemo(() => resolveActiveNav(pathname), [pathname]);

  const [expanded, setExpanded] = useState<string[]>(() =>
    active.groupId ? [active.groupId] : []
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GROUPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setExpanded(parsed.filter((id): id is string => typeof id === 'string'));
        }
      }
    } catch {
      // A corrupt value shouldn't break navigation — fall back to defaults.
    }
    setHydrated(true);
  }, []);

  // Auto-expand the parent of the active page, after storage has been applied.
  useEffect(() => {
    if (!hydrated || !active.groupId) return;
    setExpanded((prev) => (prev.includes(active.groupId!) ? prev : [...prev, active.groupId!]));
  }, [hydrated, active.groupId]);

  const persist = useCallback((next: string[]) => {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      // Private-mode storage failures are not worth surfacing.
    }
    return next;
  }, []);

  const toggleGroup = useCallback(
    (id: string) => {
      setExpanded((prev) =>
        persist(prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id])
      );
    },
    [persist]
  );

  const isExpanded = useCallback((id: string) => expanded.includes(id), [expanded]);

  return { expanded, isExpanded, toggleGroup, active };
}
