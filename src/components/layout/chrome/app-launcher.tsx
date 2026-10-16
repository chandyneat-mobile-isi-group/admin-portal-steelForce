'use client';

import { Grip, Lock } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { applicationsFor, ROADMAP_APPS } from '@/config/applications';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n';

/**
 * Jump to any application the session can open.
 *
 * The grid is `applicationsFor(permissions)` — the same authorized tree the
 * sidebar renders — so it cannot offer a module the user may not enter.
 * Roadmap entries are rendered inert: no link, no handler, marked
 * `aria-disabled`, so they read as "planned" without ever looking navigable.
 */
export function AppLauncher() {
  const { permissions } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const apps = useMemo(() => applicationsFor(permissions), [permissions]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={labelOf('app.launcher.aria', 'Open applications')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-primary"
        >
          <Grip size={18} strokeWidth={1.9} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className="w-[340px] rounded-card p-3 shadow-isi-lg">
        <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
          {labelOf('app.launcher.title', 'Applications')}
        </p>

        <div className="grid grid-cols-3 gap-1">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                href={app.href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-md p-2.5 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground">
                  {labelOf(app.labelKey, app.label)}
                </span>
              </Link>
            );
          })}

          {ROADMAP_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                aria-disabled
                title={labelOf('app.comingSoon', 'Coming soon')}
                className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-md p-2.5 text-center opacity-45"
              >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon size={17} strokeWidth={1.9} />
                  <Lock size={9} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-px" />
                </span>
                <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                  {labelOf(app.labelKey, app.label)}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
