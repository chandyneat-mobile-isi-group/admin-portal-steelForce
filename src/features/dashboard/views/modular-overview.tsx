'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { applicationsFor } from '@/config/applications';
import { isEnabled } from '@/config/features';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n';
import { statusColors } from '../data/overview';
import { useOverview } from '../hooks/use-overview';

/**
 * The module-oriented overview: what each application needs from you today.
 *
 * Sits between the other two in density. The Modular shell scopes navigation to
 * one application at a time, so its dashboard mirrors that — a card per module
 * with its own counters and a way in — rather than one undifferentiated grid.
 */
export function ModularOverview() {
  const { t, formatCurrency } = useI18n();
  const { permissions } = useAuth();
  const { stats, salesRevenueData, quotationConversion, recentOrders } = useOverview();

  const apps = useMemo(() => applicationsFor(permissions), [permissions]);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  return (
    <div className="space-y-4">
      {/* Compact KPI strip — six across, one line each. */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {stats.slice(0, 6).map((stat) => {
          const Icon = stat.icon;
          const up = stat.trend >= 0;
          return (
            <Card key={stat.title} className="rounded-card border-border p-3 shadow-isi-xs">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded ${stat.iconBg} ${stat.iconColor}`}>
                  <Icon size={13} strokeWidth={2} />
                </span>
                <span className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.title}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-1">
                <p className="text-[17px] font-bold tracking-heading text-foreground">
                  {stat.prefix === '$' ? formatCurrency(stat.value) : stat.value.toLocaleString()}
                  {stat.suffix}
                </p>
                <span
                  className={`flex items-center text-[10.5px] font-semibold ${
                    up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(stat.trend)}%
                </span>
              </div>
              <p className="mt-1 truncate text-[10.5px] text-muted-foreground" title={stat.detail}>
                {stat.detail}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-card border-border p-4 shadow-isi-xs lg:col-span-2">
          <h3 className="text-[13.5px] font-bold text-foreground">{t('chart.salesRevenue')}</h3>
          <p className="mb-3 text-[11.5px] text-muted-foreground">{t('chart.salesRevenueDesc')}</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={salesRevenueData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(173,186,202,0.2)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: '#ADBACA' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: '#ADBACA' }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="target" fill="rgba(166,200,239,0.45)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="revenue" fill="#004A98" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="rounded-card border-border p-4 shadow-isi-xs">
          <h3 className="text-[13.5px] font-bold text-foreground">{t('chart.quotationConversion')}</h3>
          <p className="mb-1 text-[11.5px] text-muted-foreground">{t('chart.statusDistribution')}</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={quotationConversion} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} cornerRadius={4}>
                {quotationConversion.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--popover))',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {quotationConversion.map((q) => (
              <div key={q.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: q.color }} />
                <span className="text-muted-foreground">{q.name}</span>
                <span className="ml-auto font-semibold text-foreground">{q.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Per-module entry points — mirrors how this shell navigates. */}
        <section className="lg:col-span-1">
          <h3 className="mb-2.5 text-[13px] font-bold text-foreground">
            {labelOf('app.launcher.title', 'Applications')}
          </h3>
          <Card className="rounded-card border-border p-1.5 shadow-isi-xs">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                    <Icon size={14} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
                    {labelOf(app.labelKey, app.label)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{app.children.length}</span>
                </Link>
              );
            })}
          </Card>
        </section>

        <section className="lg:col-span-2">
          <h3 className="mb-2.5 text-[13px] font-bold text-foreground">
            {labelOf('dashboard.recentOrders', 'Recent orders')}
          </h3>
          <Card className="overflow-hidden rounded-card border-border shadow-isi-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[t('table.orderNumber'), t('table.customer'), t('table.status'), t('table.total')].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground ${
                          i === 3 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-3 py-2.5 text-[12px] font-semibold text-primary">{order.id}</td>
                      <td className="px-3 py-2.5 text-[12px] text-foreground">{order.customer}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[order.status]}`}>
                          {t(`status.${order.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-bold text-foreground">
                        {formatCurrency(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEnabled('salesModule') && (
              <Link
                href="/orders"
                className="flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-[11.5px] font-medium text-primary hover:underline"
              >
                {labelOf('action.viewAll', 'View all')} <ArrowRight size={12} />
              </Link>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
