'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { applicationForPath, applicationsFor } from '@/config/applications';
import { resolveActiveNav } from '@/config/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n';

/**
 * Navigation scoped to the application the user is currently inside.
 *
 * The modular shell picks an app in the top bar, then works within it — so the
 * left rail shows that app's pages only, rather than the whole product. Both
 * the app list and its children come from `applicationsFor()`, which is the
 * permission-filtered navigation tree; nothing is re-declared and nothing is
 * re-checked.
 */
export function NavTree({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const { t } = useI18n();

  const apps = useMemo(() => applicationsFor(permissions), [permissions]);
  const current = useMemo(() => applicationForPath(apps, pathname), [apps, pathname]);
  const active = useMemo(() => resolveActiveNav(pathname), [pathname]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  if (!current) return null;

  return (
    <nav aria-label={labelOf(current.labelKey, current.label)} className="p-3">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-label text-muted-foreground">
        {labelOf(current.labelKey, current.label)}
      </p>
      <div className="space-y-0.5">
        {current.children.map((leaf) => {
          const Icon = leaf.icon;
          const isActive = active.leafId === leaf.id;
          return (
            <Link
              key={leaf.id}
              href={leaf.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate">{labelOf(leaf.labelKey, leaf.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** The application bar for the modular shell — one tab per accessible app. */
export function AppTabs() {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const { t } = useI18n();

  const apps = useMemo(() => applicationsFor(permissions), [permissions]);
  const current = useMemo(() => applicationForPath(apps, pathname), [apps, pathname]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
      {apps.map((app) => {
        const isActive = current?.id === app.id;
        return (
          <Link
            key={app.id}
            href={app.href}
            aria-current={isActive ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {labelOf(app.labelKey, app.label)}
          </Link>
        );
      })}
    </div>
  );
}
