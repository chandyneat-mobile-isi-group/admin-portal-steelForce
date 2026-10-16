'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Zap,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  DollarSign,
  MapPin,
  Navigation,
  ShoppingCart,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { isEnabled } from '@/config/features';
import { useAuth } from '@/lib/auth/auth-context';
import { authorizeRoute } from '@/lib/auth/authorization';
import { usePendingDepots, usePendingQuotations } from '@/features/approvals';
import { useI18n } from '@/lib/i18n';
import { useQuotations } from '@/features/sales';
import {
  DASHBOARD_PERIODS,
  repActivityFor,
  targetsFor,
  type DashboardPeriod,
  type RepDayActivity,
  type RepDayStatus,
} from '../data/overview';

/**
 * The daily sales dashboard: four headline numbers, progress against today's
 * target, how today's visits stand, what needs a manager's attention, and each
 * rep's day. Everything is summed from `repActivityToday`.
 */

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

const STATUS_STYLE: Record<RepDayStatus, string> = {
  Visiting: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'On Route': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  Done: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Not Checked In': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Off: 'bg-muted text-muted-foreground',
};

const STATUS_KEY: Record<RepDayStatus, string> = {
  Visiting: 'today.status.visiting',
  'On Route': 'today.status.onRoute',
  Done: 'today.status.done',
  'Not Checked In': 'today.status.notCheckedIn',
  Off: 'today.status.off',
};

const ACTIVE: ReadonlySet<RepDayStatus> = new Set(['Visiting', 'On Route', 'Done']);

/** Where each headline card leads, in `kpis` order. */
const KPI_LINKS = {
  sales: '/reports/sales',
  visits: '/planning/plan-vs-actual',
  orders: isEnabled('salesModule') ? '/orders' : '/reports/sales',
  reps: '/sales-reps',
};

export function SalesOverview() {
  const { t, formatCurrency } = useI18n();
  const { permissions } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const reps = useMemo(() => repActivityFor(period), [period]);
  const targets = useMemo(() => targetsFor(period), [period]);
  const quotations = useQuotations();
  const pendingQuotations = useMemo(() => quotations.filter((q) => q.status === 'Pending').length, [quotations]);
  const isToday = period === 'today';

  const totals = useMemo(() => {
    const sum = (key: 'planned' | 'completed' | 'inProgress' | 'notStarted' | 'orders' | 'sales') =>
      reps.reduce((n, r) => n + r[key], 0);
    return {
      sales: sum('sales'),
      planned: sum('planned'),
      completed: sum('completed'),
      inProgress: sum('inProgress'),
      notStarted: sum('notStarted'),
      orders: sum('orders'),
      active: reps.filter((r) => ACTIVE.has(r.status)).length,
      notCheckedIn: reps.filter((r) => r.status === 'Not Checked In').length,
    };
  }, [reps]);

  const targetPct = pct(totals.sales, targets.salesTarget);
  const visitPct = pct(totals.completed, totals.planned);

  const kpis = [
    {
      label: t('today.sales'),
      value: formatCurrency(totals.sales),
      sub: t('today.ofTarget', { pct: targetPct }),
      icon: DollarSign,
      tone: 'text-blue-600 bg-blue-500/10',
      progress: targetPct,
    },
    {
      label: t('today.visits'),
      value: `${totals.completed} / ${totals.planned}`,
      sub: t('today.visitsDone', { pct: visitPct }),
      icon: MapPin,
      tone: 'text-emerald-600 bg-emerald-500/10',
      progress: visitPct,
    },
    {
      label: t('today.orders'),
      value: String(totals.orders),
      sub: targets.ordersTrend >= 0 ? t('today.ordersTrend', { pct: targets.ordersTrend }) : `${targets.ordersTrend}% vs last week`,
      icon: ShoppingCart,
      tone: 'text-orange-600 bg-orange-500/10',
      trendUp: targets.ordersTrend >= 0,
    },
    {
      label: t('today.salesReps'),
      value: t('today.repsActive', { active: totals.active, total: reps.length }),
      sub: isToday ? t('today.repsSub', { count: totals.notCheckedIn }) : `${reps.filter((r) => r.status === 'Off').length} off in this period`,
      icon: Users,
      tone: 'text-violet-600 bg-violet-500/10',
      progress: pct(totals.active, reps.length),
    },
  ];

  const actions = [
    { count: totals.notStarted, label: t('today.action.missed', { count: totals.notStarted }), href: '/planning/plan-vs-actual' },
    {
      count: pendingQuotations,
      label: t('today.action.quotations', { count: pendingQuotations }),
      // Sent to the approval queue when it is switched on; otherwise the alert has nowhere to go.
      href: isEnabled('approvalModule') ? '/approval/quotations' : isEnabled('salesModule') ? '/quotations' : undefined,
    },
    { count: totals.notCheckedIn, label: t('today.action.checkIn', { count: totals.notCheckedIn }), href: '/sales-reps' },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-5">
      {/* Period */}
      <div className="flex items-center justify-end gap-1.5 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Dashboard period">
        {DASHBOARD_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
              period === p.value ? 'gradient-primary text-white shadow-md shadow-blue-200/50' : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const href = [KPI_LINKS.sales, KPI_LINKS.visits, KPI_LINKS.orders, KPI_LINKS.reps][i];
          const linked = href && authorizeRoute(href, permissions).allowed;
          const card = (
          <Card key={k.label} className={`p-5 rounded-card border-surface card-shadow h-full ${linked ? 'transition-all hover:-translate-y-0.5 hover:border-primary/30' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-muted-foreground">{k.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.tone}`}>
                <k.icon size={17} />
              </span>
            </div>
            <p className="mt-2 text-[24px] font-bold text-main tabular-nums leading-tight">{k.value}</p>
            <p className={`mt-1 inline-flex items-center gap-1 text-[12px] ${k.trendUp ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}`}>
              {k.trendUp && <ArrowUpRight size={13} />}
              {k.sub}
            </p>
            {k.progress != null && (
              <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.min(k.progress, 100)}%` }} />
              </div>
            )}
          </Card>
          );
          return linked ? (
            <Link key={k.label} href={href} className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>

      <QuickActions />

      {/* Sales performance against today's target */}
      <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <BarChart3 size={17} className="text-primary" />
          <h3 className="text-[15px] font-bold text-main">{t('today.salesPerformance')}</h3>
          <span className="ml-auto text-[12px] text-muted-foreground">
            {t('today.actualOfTarget', { actual: formatCurrency(totals.sales), target: formatCurrency(targets.salesTarget) })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-14 text-[12px] font-medium text-muted-foreground">{t('today.target')}</span>
          <div className="relative h-4 flex-1 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
              style={{ width: `${Math.min(targetPct, 100)}%` }}
            />
          </div>
          <span className="w-12 text-right text-[16px] font-bold text-main tabular-nums">{targetPct}%</span>
        </div>
        <p className="mt-2 pl-[72px] text-[11.5px] text-muted-foreground">
          {targetPct >= 100
            ? isToday ? t('today.targetReached') : 'Target reached for this period'
            : t('today.toGo', { amount: formatCurrency(targets.salesTarget - totals.sales) })}
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's visits */}
        <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={17} className="text-primary" />
            <h3 className="text-[15px] font-bold text-main">{isToday ? t('today.todaysVisits') : `${t('today.visits')} · ${DASHBOARD_PERIODS.find((p) => p.value === period)?.label}`}</h3>
            <Link href="/planning/plan-vs-actual" className="ml-auto inline-flex items-center text-[12px] font-medium text-primary hover:underline">
              {t('action.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {[
              { label: t('today.completed'), value: totals.completed, icon: CheckCircle2, tone: 'text-emerald-600', bar: 'bg-emerald-500/70' },
              { label: t('today.inProgress'), value: totals.inProgress, icon: Navigation, tone: 'text-sky-600', bar: 'bg-sky-500/70' },
              { label: t('today.notStarted'), value: totals.notStarted, icon: CircleDashed, tone: 'text-muted-foreground', bar: 'bg-slate-400/60' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 rounded-xl bg-muted/25 px-3 py-2.5">
                <row.icon size={16} className={row.tone} />
                <span className="w-28 text-[13px] text-main">{row.label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct(row.value, totals.planned)}%` }} />
                </div>
                <span className="w-8 text-right text-[15px] font-bold text-main tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Action required */}
        <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={17} className="text-amber-500" />
            <h3 className="text-[15px] font-bold text-main">{t('today.actionRequired')}</h3>
            {actions.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {actions.length}
              </span>
            )}
          </div>
          {actions.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <CheckCircle2 size={16} className="text-emerald-500" /> {t('today.allClear')}
            </p>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => {
                const body = (
                  <>
                    <AlertTriangle size={16} className="flex-shrink-0 text-amber-500" />
                    <span className="flex-1 text-[13px] text-main">{a.label}</span>
                    {a.href && <ChevronRight size={15} className="text-muted-foreground" />}
                  </>
                );
                const cls = 'flex items-center gap-3 rounded-xl bg-amber-500/[0.06] px-3 py-2.5';
                return a.href ? (
                  <Link key={a.label} href={a.href} className={`${cls} hover:bg-amber-500/[0.11] transition-colors`}>
                    {body}
                  </Link>
                ) : (
                  <div key={a.label} className={cls}>{body}</div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <RepActivityTable reps={reps} />
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────

/**
 * Shortcuts to the screens a manager opens most. A shortcut is shown only when the
 * viewer may open its page, by the same rule the sidebar and route guard use.
 */
function QuickActions() {
  const { t } = useI18n();
  const { permissions, can } = useAuth();
  const allowed = (href: string) => authorizeRoute(href, permissions).allowed;

  const approvalsOn = allowed('/approval');
  const canSales = approvalsOn && can('sales.manage');
  const canDepots = approvalsOn && can('customers.manage');
  const quotations = usePendingQuotations(1, canSales);
  const depots = usePendingDepots(1, canDepots);
  const pending =
    (canSales ? quotations.data?.totalCount ?? 0 : 0) + (canDepots ? depots.data?.totalCount ?? 0 : 0);

  const items = [
    { href: '/approval', label: t('today.qa.approvals'), hint: t('today.qa.approvalsHint'), icon: ClipboardCheck, tone: 'text-amber-600 bg-amber-500/10', count: pending },
    { href: '/planning/call-plans', label: t('today.qa.uploadCallPlans'), hint: t('today.qa.uploadCallPlansHint'), icon: CalendarDays, tone: 'text-sky-600 bg-sky-500/10' },
    { href: '/sales-reps', label: t('today.qa.salesReps'), hint: t('today.qa.salesRepsHint'), icon: Users, tone: 'text-violet-600 bg-violet-500/10' },
    { href: '/reports/sales', label: t('today.qa.reports'), hint: t('today.qa.reportsHint'), icon: BarChart3, tone: 'text-emerald-600 bg-emerald-500/10' },
  ].filter((item) => allowed(item.href));

  if (items.length === 0) return null;

  return (
    <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={17} className="text-amber-500" />
        <h3 className="text-[15px] font-bold text-main">{t('today.quickActions')}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-xl border border-surface px-4 py-3 transition-colors hover:border-primary/30 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-main">
                {item.label}
                {!!item.count && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {item.count}
                  </span>
                )}
              </span>
              <span className="block truncate text-[11.5px] text-muted-foreground">{item.hint}</span>
            </span>
            <ChevronRight size={15} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Sales rep activity ────────────────────────────────────────────────────────

type SortKey = 'name' | 'visits' | 'orders' | 'sales';

function RepActivityTable({ reps }: { reps: RepDayActivity[] }) {
  const { t, formatCurrency } = useI18n();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState<SortKey>('sales');

  const statusOptions = (Object.keys(STATUS_KEY) as RepDayStatus[]).map((s) => ({ value: s, label: t(STATUS_KEY[s]) }));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reps
      .filter((r) => (status === 'All' || r.status === status) && (!q || `${r.name} ${r.team}`.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'visits' ? b.completed - a.completed
        : sort === 'orders' ? b.orders - a.orders
        : b.sales - a.sales
      );
  }, [reps, search, status, sort]);

  const Header = ({ k, label, align = 'right' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th className={`py-2.5 px-3 font-semibold ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button
        type="button"
        onClick={() => setSort(k)}
        className={`uppercase tracking-wider hover:text-main ${sort === k ? 'text-primary' : ''}`}
      >
        {label}
        {sort === k && ' ↓'}
      </button>
    </th>
  );

  return (
    <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Users size={17} className="text-primary" />
        <h3 className="text-[15px] font-bold text-main mr-auto">{t('today.repActivity')}</h3>
        <SearchBar value={search} onChange={setSearch} placeholder={t('today.searchRep')} className="w-full sm:w-[220px]" />
        <FilterChip
          label={t('today.statusLabel')}
          icon={UserCheck}
          value={status}
          options={statusOptions}
          onChange={setStatus}
          allLabel={t('today.allStatuses')}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="border-b border-surface text-[10.5px] text-muted-foreground">
              <Header k="name" label={t('today.col.rep')} align="left" />
              <Header k="visits" label={t('today.col.visits')} />
              <Header k="orders" label={t('today.col.orders')} />
              <Header k="sales" label={t('today.col.sales')} />
              <th className="py-2.5 px-3 text-left font-semibold uppercase tracking-wider">{t('today.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-surface last:border-0 hover:bg-accent/20">
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-main">{r.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{r.team}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="tabular-nums text-main">{r.completed} / {r.planned}</span>
                  <div className="ml-auto mt-1 h-1 w-16 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${pct(r.completed, r.planned)}%` }} />
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-main">{r.orders}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-main">{r.sales ? formatCurrency(r.sales) : '—'}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>
                    {t(STATUS_KEY[r.status])}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[12.5px] text-muted-foreground">{t('today.noReps')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
