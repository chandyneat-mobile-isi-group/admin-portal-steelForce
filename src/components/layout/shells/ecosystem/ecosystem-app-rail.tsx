'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { applicationForPath, applicationsFor } from '@/config/applications';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/**
 * Quick access to every application the session can open.
 *
 * Horizontal beside the page title on desktop, vertical inside the mobile
 * sheet. Reads `applicationsFor(permissions)`, so it lists exactly what the
 * sidebar would have listed in the workspace shell.
 */
export function EcosystemAppRail({
  orientation = 'horizontal',
  onNavigate,
}: {
  orientation?: 'horizontal' | 'vertical';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const { t } = useI18n();

  const apps = useMemo(() => applicationsFor(permissions), [permissions]);
  const current = useMemo(() => applicationForPath(apps, pathname), [apps, pathname]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const vertical = orientation === 'vertical';

  return (
    <nav
      aria-label={labelOf('app.launcher.title', 'Applications')}
      className={
        vertical ? 'flex flex-col gap-0.5 p-3' : 'flex items-center gap-0.5 overflow-x-auto scrollbar-hide'
      }
    >
      {apps.map((app) => {
        const Icon = app.icon;
        const isActive = current?.id === app.id;

        if (app.children.length > 1) {
          return (
            <DropdownMenu key={app.id}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  } ${vertical ? 'w-full' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className={vertical ? '' : 'hidden xl:inline'}>
                      {labelOf(app.labelKey, app.label)}
                    </span>
                  </div>
                  <ChevronDown size={14} className="opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={vertical ? 'start' : 'start'} side={vertical ? 'right' : 'bottom'} className="w-56">
                {app.children.map((child) => {
                  const ChildIcon = child.icon || Icon;
                  return (
                    <DropdownMenuItem key={child.id} asChild>
                      <Link href={child.href} onClick={onNavigate} className="flex items-center gap-2.5 w-full cursor-pointer">
                        <ChildIcon size={14} className="text-muted-foreground" />
                        <span className="font-medium text-[12.5px]">{labelOf(child.labelKey, child.label)}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link
            key={app.id}
            href={app.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            } ${vertical ? 'w-full' : ''}`}
          >
            <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className={vertical ? '' : 'hidden xl:inline'}>
              {labelOf(app.labelKey, app.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
