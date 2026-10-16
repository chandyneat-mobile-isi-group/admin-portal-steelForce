'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { breadcrumbFor } from '@/config/navigation';
import { useI18n } from '@/lib/i18n';

/**
 * Where the user is, derived from the navigation tree rather than a hand-kept
 * table — see `breadcrumbFor`. A new module gets a correct title and trail the
 * moment it is added to `NAV_SECTIONS`.
 */
export function PageTitle({ showTrail = true }: { showTrail?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const crumbs = useMemo(() => breadcrumbFor(pathname), [pathname]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const last = crumbs[crumbs.length - 1];
  const title = last ? labelOf(last.labelKey, last.label) : t('app.name');

  return (
    <div className="min-w-0">
      {showTrail && crumbs.length > 0 && (
        <motion.nav
          key={pathname}
          aria-label="Breadcrumb"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-0.5 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex"
        >
          <Link href="/dashboard" className="font-medium hover:text-primary">
            {t('breadcrumb.home')}
          </Link>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${crumb.labelKey}-${i}`} className="flex items-center gap-1.5">
                <ChevronRight size={11} className="text-border" />
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-primary">
                    {labelOf(crumb.labelKey, crumb.label)}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-medium text-primary' : undefined}>
                    {labelOf(crumb.labelKey, crumb.label)}
                  </span>
                )}
              </span>
            );
          })}
        </motion.nav>
      )}

      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="truncate text-[17px] font-bold leading-tight tracking-heading text-foreground sm:text-[21px]"
      >
        {title}
      </motion.h1>
    </div>
  );
}
