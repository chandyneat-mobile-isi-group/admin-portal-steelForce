'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSidebarCollapse } from './use-sidebar';

/**
 * The chrome state a workspace shell needs, in one hook.
 *
 * Previously this lived inside `AppShell`. Now that three shells exist, the
 * mobile drawer and the collapse shortcut are shared behaviour rather than one
 * shell's implementation detail — a shell that has no sidebar simply ignores
 * `collapsed`.
 */
export function useShellChrome() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle: toggleCollapse } = useSidebarCollapse();
  const pathname = usePathname();

  // Navigating closes the drawer — otherwise it stays over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCollapse]);

  return {
    pathname,
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
    collapsed,
    toggleCollapse,
  };
}
