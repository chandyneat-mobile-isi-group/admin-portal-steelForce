'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Lock, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { applicationsFor, ROADMAP_APPS } from '@/config/applications';
import { isEnabled } from '@/config/features';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n';
import { statusColors } from '../data/overview';
import { useOverview } from '../hooks/use-overview';

/** Before noon, after noon, after six — enough for a greeting. */
function greetingKey(hour: number) {
  if (hour < 12) return { key: 'greeting.morning', fallback: 'Good morning' };
  if (hour < 18) return { key: 'greeting.afternoon', fallback: 'Good afternoon' };
  return { key: 'greeting.evening', fallback: 'Good evening' };
}

/**
 * The app-centric overview: who you are, what you can open, what needs you.
 *
 * Deliberately lighter than the workspace grid. Someone in the Ecosystem shell
 * is deciding where to go, not analysing — so this leads with applications and
 * keeps the numbers to the six-KPI summary with a link into the real report.
 *
 * Every tile comes from `applicationsFor(permissions)`, the same authorized
 * tree the navigation uses, so the grid cannot offer an unreachable module.
 */
export function EcosystemOverview() {
  const { t, formatCurrency } = useI18n();
  const { user, permissions } = useAuth();
  const { stats, performanceSummary, recentOrders } = useOverview();

  const apps = useMemo(() => applicationsFor(permissions), [permissions]);
  const salesEnabled = isEnabled('salesModule');
  const quickActions = useMemo(
    () => apps.flatMap((app) => app.children).filter((leaf) => leaf.href.endsWith('/new')).slice(0, 4),
    [apps]
  );
  const greeting = useMemo(() => greetingKey(new Date().getHours()), []);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const headline = stats;

  return (
    <div className="space-y-7">
      <header>
        <p className="isi-eyebrow">{labelOf('app.portal', 'Admin Portal')}</p>
        <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-display text-foreground sm:text-[32px]">
          {labelOf(greeting.key, greeting.fallback)}
          {user?.name ? `, ${user.name}` : ''}
        </h2>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {labelOf(
            'dashboard.ecosystemLede',
            'Everything you have access to, in one place.'
          )}
        </p>
      </header>

      {/* Applications */}
      <section aria-labelledby="apps-heading">
        <h3 id="apps-heading" className="mb-3 text-[13px] font-bold text-foreground">
          {labelOf('app.launcher.title', 'Applications')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {apps.map((app, i) => {
            const Icon = app.icon;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={app.href}
                  className="group flex h-full flex-col items-start gap-3 rounded-card border border-border bg-card p-4 shadow-isi-xs transition-all duration-med ease-standard hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-isi-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {labelOf(app.labelKey, app.label)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {app.children.length}{' '}
                      {app.children.length === 1
                        ? labelOf('app.page', 'page')
                        : labelOf('app.pages', 'pages')}
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* Roadmap modules. Inert by construction — there is no route yet. */}
          {ROADMAP_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                aria-disabled
                className="flex h-full cursor-not-allowed flex-col items-start gap-3 rounded-card border border-dashed border-border bg-card/40 p-4"
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon size={19} strokeWidth={1.9} />
                  <Lock size={10} className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-muted-foreground">
                    {labelOf(app.labelKey, app.label)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                    {labelOf('app.comingSoon', 'Coming soon')}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Business overview */}
        <section className="lg:col-span-2" aria-labelledby="overview-heading">
          <h3 id="overview-heading" className="mb-3 text-[13px] font-bold text-foreground">
            {labelOf('dashboard.businessOverview', 'Business overview')}
          </h3>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {headline.map((stat) => {
              const Icon = stat.icon;
              const up = stat.trend >= 0;
              return (
                <Card key={stat.title} className="rounded-card border-border p-4 shadow-isi-xs">
                  <div className="flex items-start justify-between">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${stat.iconBg} ${stat.iconColor}`}>
                      <Icon size={15} strokeWidth={1.9} />
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                        up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(stat.trend)}%
                    </span>
                  </div>
                  <p className="mt-3 text-[20px] font-bold tracking-heading text-foreground">
                    {stat.prefix === '$' ? formatCurrency(stat.value) : stat.value.toLocaleString()}
                    {stat.suffix}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground/80" title={stat.detail}>
                    {stat.detail}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Recent activity */}
          <h3 className="mb-3 mt-6 text-[13px] font-bold text-foreground">
            {labelOf('dashboard.recentActivity', 'Recent activity')}
          </h3>
          <Card className="rounded-card border-border p-2 shadow-isi-xs">
            {recentOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="text-[12px] font-semibold text-primary">{order.id}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                  {order.customer}
                </span>
                <span
                  className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${statusColors[order.status]}`}
                >
                  {t(`status.${order.status.toLowerCase()}`)}
                </span>
                <span className="text-[12px] font-bold text-foreground">
                  {formatCurrency(order.total)}
                </span>
              </div>
            ))}
            {salesEnabled && (
              <Link
                href="/orders"
                className="flex items-center justify-center gap-1.5 border-t border-border pt-2.5 text-[11.5px] font-medium text-primary hover:underline"
              >
                {labelOf('action.viewAll', 'View all')} <ArrowRight size={12} />
              </Link>
            )}
          </Card>
        </section>

        {/* Quick actions + performance */}
        <aside className="space-y-5">
          {(quickActions.length > 0 || salesEnabled) && (
            <section aria-labelledby="quick-heading">
              <h3 id="quick-heading" className="mb-3 text-[13px] font-bold text-foreground">
                {labelOf('dashboard.quickActions', 'Quick actions')}
              </h3>
              <Card className="rounded-card border-border p-2 shadow-isi-xs">
                {quickActions.map((leaf) => (
                  <Link
                    key={leaf.id}
                    href={leaf.href}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <Plus size={14} className="text-primary" />
                    {labelOf(leaf.labelKey, leaf.label)}
                  </Link>
                ))}
                {salesEnabled && (
                  <Link
                    href="/quotations"
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <Plus size={14} className="text-primary" />
                    {labelOf('nav.quotations', 'Quotations')}
                  </Link>
                )}
              </Card>
            </section>
          )}

          <section aria-labelledby="perf-heading">
            <h3 id="perf-heading" className="mb-3 text-[13px] font-bold text-foreground">
              {labelOf('chart.performanceSummary', 'Performance')}
            </h3>
            <Card className="rounded-card border-border p-4 shadow-isi-xs">
              <dl className="space-y-2.5">
                {performanceSummary.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <dt className="truncate text-[12px] text-muted-foreground">{row.label}</dt>
                    <dd className="flex items-center gap-1 text-[12.5px] font-bold text-foreground">
                      {row.value}
                      {row.trend === 'up' ? (
                        <ArrowUpRight size={12} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownRight size={12} className="text-red-600 dark:text-red-400" />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
