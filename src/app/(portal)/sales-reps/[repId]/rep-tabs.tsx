'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Flag,
  Hash,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  Store,
  Target,
  User,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { StatusPill } from '@/components/shared/status-pill';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { useSalesRep, type SalesRepDetailDto, type SalesRepDto } from '@/features/sales-reps';
import {
  DEPOT_STATUSES,
  DepotDrawer,
  STATUS_TONE,
  depotsRepository,
  type CrmDepot,
} from '@/features/depots';
import {
  PROVINCES,
  PlanningProvider,
  PriorityBadge,
  Segmented,
  StatusBadge,
  addDays,
  buildEntries,
  formatDay,
  isoDate,
  parseIso,
  startOfWeek,
  usePlanning,
  type CalendarEntry,
} from '@/features/planning';

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

function when(iso: string | null | undefined, pattern = 'd MMM yyyy, HH:mm') {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : format(date, pattern);
}

// ── Sales Information ─────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface last:border-0">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-[13px] text-main break-words">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

export function SalesInfoTab({ detail }: { detail: SalesRepDetailDto }) {
  const { rep, activeRoute } = detail;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Contact" icon={Phone} />
        <InfoRow icon={Phone} label="Phone" value={rep.phoneNumber} />
        <InfoRow icon={Mail} label="E-mail" value={rep.email} />
      </Card>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Assignment" icon={MapPin} />
        <InfoRow icon={Hash} label="Employee code" value={rep.employeeCode} />
        <InfoRow icon={MapPin} label="Territory" value={rep.zone} />
        <InfoRow icon={Building2} label="Home depot" value={rep.depotCode} />
        <InfoRow icon={ShieldCheck} label="Role" value={rep.roles.join(', ')} />
      </Card>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Account" icon={User} />
        <InfoRow
          icon={CheckCircle2}
          label="Status"
          value={<StatusPill label={rep.isActive ? 'Active' : 'Suspended'} tone={rep.isActive ? 'positive' : 'neutral'} />}
        />
        <InfoRow icon={CalendarCheck2} label="Joined" value={when(detail.joinDate, 'd MMM yyyy')} />
        <InfoRow icon={LogIn} label="Last sign-in" value={when(rep.lastLoginAt) ?? 'Never signed in'} />
      </Card>

      <Card className="p-5 rounded-card border-surface card-shadow lg:col-span-3">
        <SectionHeader title="Today's route" icon={Route} />
        {activeRoute ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Route', value: activeRoute.name },
              { label: 'Status', value: activeRoute.status },
              { label: 'Stops', value: `${activeRoute.completedStopCount} / ${activeRoute.stopCount} done` },
              { label: 'Distance', value: activeRoute.estimatedDistanceKm != null ? `~${activeRoute.estimatedDistanceKm} km` : '—' },
              { label: 'Territory', value: activeRoute.territory || '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/25 px-3 py-2.5 min-w-0">
                <p className="text-[10.5px] text-muted-foreground">{s.label}</p>
                <p className="text-[13px] font-semibold text-main truncate">{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No route planned for today.</p>
        )}
      </Card>
    </div>
  );
}

// ── Performance ───────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

function windowFor(period: Period) {
  const today = new Date();
  const from =
    period === 'month' ? startOfMonth(today)
    : period === '30d' ? subDays(today, 29)
    : period === '90d' ? subDays(today, 89)
    : startOfYear(today);
  return { from: format(from, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
}

const ACTIVITY_TYPES = [
  { value: 'checkIn', label: 'Check-ins' },
  { value: 'checkOut', label: 'Check-outs' },
  { value: 'missed', label: 'Missed' },
];

const ACTIVITY_LOOK = {
  checkIn: { icon: LogIn, label: 'Checked in', tone: 'text-sky-600 bg-sky-500/10' },
  checkOut: { icon: LogOut, label: 'Checked out', tone: 'text-emerald-600 bg-emerald-500/10' },
  missed: { icon: XCircle, label: 'Missed', tone: 'text-red-500 bg-red-500/10' },
} as const;

export function PerformanceTab({ repId }: { repId: string }) {
  const [period, setPeriod] = useState<Period>('month');
  const [activityType, setActivityType] = useState('All');
  const window = useMemo(() => windowFor(period), [period]);
  const { data, isLoading } = useSalesRep(repId, window);
  const m = data?.rep.metrics;

  const activity = (data?.recentActivity ?? []).filter((a) => activityType === 'All' || a.type === activityType);
  const remaining = m ? Math.max(m.scheduledVisits - m.completedVisits - m.missedVisits, 0) : 0;
  const share = (n: number) => (m && m.scheduledVisits ? (n / m.scheduledVisits) * 100 : 0);
  const rateTone =
    m?.successRate == null ? 'text-muted-foreground'
    : m.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : m.successRate >= 60 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={period} options={PERIODS} onChange={setPeriod} />
        <span className="text-[11.5px] text-muted-foreground">
          {formatDate(window.from)} – {formatDate(window.to)}
        </span>
        {isLoading && <Loader2 size={15} className="animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Scheduled visits', value: m?.scheduledVisits, icon: CalendarCheck2, tone: 'text-sky-600 bg-sky-500/10' },
          { label: 'Completed', value: m?.completedVisits, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Missed', value: m?.missedVisits, icon: XCircle, tone: 'text-red-500 bg-red-500/10' },
          { label: 'Completion rate', value: m?.successRate == null ? '—' : `${m.successRate}%`, icon: Target, tone: 'text-amber-600 bg-amber-500/10' },
          { label: 'Flagged visits', value: m?.flaggedVisits, icon: AlertTriangle, tone: 'text-violet-600 bg-violet-500/10' },
        ].map((s) => (
          <Card key={s.label} className="p-4 rounded-card border-surface card-shadow">
            <span className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon size={16} />
            </span>
            <p className="text-[11.5px] text-muted-foreground">{s.label}</p>
            <p className="text-[20px] font-bold text-main tabular-nums">{m ? s.value ?? 0 : '—'}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Visit outcome" subtitle="Share of scheduled visits in the period" icon={Target} />
        {!m || m.scheduledVisits === 0 ? (
          <p className="text-[12px] text-muted-foreground">Nothing was scheduled in this period.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted/40">
              <div className="bg-emerald-500/80" style={{ width: `${share(m.completedVisits)}%` }} />
              <div className="bg-red-400/80" style={{ width: `${share(m.missedVisits)}%` }} />
              <div className="bg-sky-300/70" style={{ width: `${share(remaining)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
              <Legend color="bg-emerald-500/80" label="Completed" value={m.completedVisits} />
              <Legend color="bg-red-400/80" label="Missed" value={m.missedVisits} />
              <Legend color="bg-sky-300/70" label="Still open" value={remaining} />
              <span className={`ml-auto font-semibold ${rateTone}`}>
                {m.successRate == null ? '' : `${m.successRate}% completion`}
              </span>
            </div>
          </>
        )}
      </Card>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader
          title="Recent field activity"
          icon={Clock}
          count={activity.length}
          action={
            <FilterChip
              label="Type"
              icon={Layers}
              value={activityType}
              options={ACTIVITY_TYPES}
              onChange={setActivityType}
              allLabel="All activity"
            />
          }
        />
        {activity.length === 0 ? (
          <EmptyState icon={Clock} title="No field activity recorded" />
        ) : (
          <ol className="space-y-1">
            {activity.map((event) => {
              const look = ACTIVITY_LOOK[event.type];
              return (
                <li
                  key={`${event.visitId}-${event.type}-${event.timestamp}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/20"
                >
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${look.tone}`}>
                    <look.icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-main truncate">{event.customerName || event.customerId}</p>
                    <p className="text-[11px] text-muted-foreground">{look.label}</p>
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{when(event.timestamp, 'd MMM, HH:mm')}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Figures are counted from route stops. Revenue and sales targets are not stored on this platform, so they are not shown here.
      </p>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label} <b className="font-semibold text-main tabular-nums">{value}</b>
    </span>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────

/** The schedule reads the planning board, which needs its provider. */
export function ScheduleTab({ rep, activeRoute }: { rep: SalesRepDto; activeRoute: SalesRepDetailDto['activeRoute'] }) {
  return (
    <PlanningProvider>
      <RepSchedule rep={rep} activeRoute={activeRoute ?? null} />
    </PlanningProvider>
  );
}

const TYPE_VIEWS = [
  { value: 'all', label: 'All' },
  { value: 'visit', label: 'Visits' },
  { value: 'call', label: 'Call plans' },
] as const;

function RepSchedule({ rep, activeRoute }: { rep: SalesRepDto; activeRoute: SalesRepDetailDto['activeRoute'] }) {
  const { stopViews, callPlans, reps, filters, setFilter, live, loading } = usePlanning();
  const [type, setType] = useState<(typeof TYPE_VIEWS)[number]['value']>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const today = isoDate(new Date());

  const entries = useMemo(
    () => buildEntries(stopViews, callPlans, reps, filters.visitDate).filter((e) => e.repId === rep.id),
    [stopViews, callPlans, reps, filters.visitDate, rep.id]
  );

  // Until a day is picked, open on this rep's busiest day so the tab is not blank.
  const busiest = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => counts.set(e.date, (counts.get(e.date) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? filters.visitDate;
  }, [entries, filters.visitDate]);
  const day = selected ?? busiest;

  // The live board holds one date at a time, so picking a day loads that day's board.
  useEffect(() => {
    if (live && selected && selected !== filters.visitDate) setFilter('visitDate', selected);
  }, [live, selected, filters.visitDate, setFilter]);

  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i));
  const countOn = (iso: string) => entries.filter((e) => e.date === iso).length;
  const agenda = entries
    .filter((e) => e.date === day && (type === 'all' || e.kind === type))
    .sort((a, b) => a.time.localeCompare(b.time));
  const done = agenda.filter((e) => e.stopStatus === 'Completed').length;

  return (
    <div className="space-y-4">
      {activeRoute && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-surface bg-primary/[0.04] px-4 py-3 text-[12px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-main">
            <Route size={14} className="text-primary" /> Today: {activeRoute.name}
          </span>
          <span className="text-muted-foreground">{activeRoute.status}</span>
          <span className="text-muted-foreground tabular-nums">
            {activeRoute.completedStopCount}/{activeRoute.stopCount} stops done
          </span>
        </div>
      )}

      <Card className="p-4 sm:p-5 rounded-card border-surface card-shadow">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelected(addDays(day, -7))} aria-label="Previous week">
            <ChevronLeft size={17} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelected(addDays(day, 7))} aria-label="Next week">
            <ChevronRight size={17} />
          </Button>
          <h3 className="text-[14px] font-semibold text-main">
            {formatDay(week[0], { day: 'numeric', month: 'short' })} – {formatDay(week[6], { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSelected(today)}>
            Today
          </Button>
        </div>

        {/* Week strip: one tile per day, with how much is planned. */}
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((iso) => {
            const count = countOn(iso);
            const active = iso === day;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={`rounded-xl border px-1 py-2 text-center transition-colors ${
                  active ? 'border-primary/40 bg-primary/[0.07]' : 'border-surface hover:bg-accent/30'
                }`}
              >
                <span className={`block text-[10.5px] font-bold uppercase tracking-wider ${iso === today ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formatDay(iso, { weekday: 'short' })}
                </span>
                <span className="block text-[15px] font-semibold text-main tabular-nums">{parseIso(iso).getDate()}</span>
                <span className={`block text-[10.5px] tabular-nums ${count ? 'text-main' : 'text-muted-foreground/60'}`}>
                  {count ? `${count} planned` : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5 rounded-card border-surface card-shadow">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-[14px] font-semibold text-main">
              {formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p className="text-[11.5px] text-muted-foreground">
              {agenda.length} planned · {done} completed
            </p>
          </div>
          <div className="ml-auto">
            <Segmented value={type} options={TYPE_VIEWS} onChange={setType} />
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : agenda.length === 0 ? (
          <EmptyState icon={CalendarX2} title="Nothing planned this day" hint="Pick another day in the week above." />
        ) : (
          <ol className="relative space-y-2 before:absolute before:left-[52px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {agenda.map((entry) => (
              <AgendaItem key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function AgendaItem({ entry }: { entry: CalendarEntry }) {
  const finished = entry.stopStatus === 'Completed' || entry.stopStatus === 'Skipped';
  return (
    <li className="relative flex items-start gap-4">
      <span className="w-10 flex-shrink-0 pt-2.5 text-right text-[12px] font-semibold tabular-nums text-muted-foreground">
        {entry.time}
      </span>
      <span
        className={`relative z-10 mt-3.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ring-4 ring-card ${
          entry.kind === 'call' ? 'bg-violet-400' : finished ? 'bg-emerald-500' : 'bg-primary'
        }`}
      />
      <div className="min-w-0 flex-1 rounded-xl bg-muted/25 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[13px] font-semibold text-main ${finished ? 'text-muted-foreground' : ''}`}>{entry.title}</span>
          {entry.kind === 'call' ? (
            <span className="rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-500/10">
              Call plan
            </span>
          ) : (
            entry.stopStatus && <StatusBadge status={entry.stopStatus} />
          )}
          <span className="ml-auto"><PriorityBadge priority={entry.priority} /></span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
          {entry.subtitle}
          {entry.province && ` · ${entry.province}`}
        </p>
      </div>
    </li>
  );
}

// ── Depots ────────────────────────────────────────────────────────────────────

const EMPTY_DEPOTS: CrmDepot[] = [];
const NEEDS_ATTENTION = new Set(['Needs Follow-up', 'At Risk']);

export function DepotsTab({ repId }: { repId: string }) {
  const load = useCallback(
    (signal: AbortSignal) => depotsRepository.list({ salesRepId: repId }, signal),
    [repId]
  );
  const { data, isLoading, error, refetch } = useRepositoryQuery(['depots', 'rep', repId], load);
  const all = data?.items ?? EMPTY_DEPOTS;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [province, setProvince] = useState('All');
  const [open, setOpen] = useState<CrmDepot | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => {
      if (status !== 'All' && d.status !== status) return false;
      if (province !== 'All' && d.province !== province) return false;
      if (q && !`${d.name} ${d.code} ${d.contactPerson ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, search, status, province]);

  const summary = {
    total: all.length,
    active: all.filter((d) => d.status === 'Active').length,
    attention: all.filter((d) => NEEDS_ATTENTION.has(d.status)).length,
    value: all.reduce((sum, d) => sum + (d.salesValue ?? 0), 0),
  };
  const filtersOn = [search.trim(), status !== 'All', province !== 'All'].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Depots', value: summary.total, icon: Store, tone: 'text-sky-600 bg-sky-500/10' },
          { label: 'Active', value: summary.active, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Needs attention', value: summary.attention, icon: Flag, tone: 'text-amber-600 bg-amber-500/10' },
          { label: 'Sales value (12 mo)', value: formatCurrency(summary.value, true), icon: DollarSign, tone: 'text-violet-600 bg-violet-500/10' },
        ].map((s) => (
          <Card key={s.label} className="p-4 rounded-card border-surface card-shadow">
            <span className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon size={16} />
            </span>
            <p className="text-[11.5px] text-muted-foreground">{s.label}</p>
            <p className="text-[20px] font-bold text-main tabular-nums">{isLoading ? '—' : s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5 rounded-card border-surface card-shadow">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search depot, code or contact…" className="w-full sm:w-[260px]" />
          <FilterChip label="Status" icon={Flag} value={status} options={opts(DEPOT_STATUSES)} onChange={setStatus} allLabel="All statuses" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" searchable />
          {filtersOn > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus('All'); setProvince('All'); }}>
              Clear {filtersOn}
            </Button>
          )}
          <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
            {rows.length} of {all.length}
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-[12.5px] text-red-500 mb-2">Depots could not be loaded.</p>
            <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Store}
            title={all.length ? 'No depots match these filters' : 'No depots assigned to this rep'}
            hint={all.length ? 'Clear a filter to see more.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead>
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold py-2 px-2">Depot</th>
                  <th className="text-left font-semibold py-2 px-2">Province</th>
                  <th className="text-left font-semibold py-2 px-2">Contact</th>
                  <th className="text-left font-semibold py-2 px-2">Status</th>
                  <th className="text-right font-semibold py-2 px-2">Sales (12 mo)</th>
                  <th className="text-left font-semibold py-2 px-2">Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setOpen(d)}
                    className="cursor-pointer border-b border-surface last:border-0 hover:bg-accent/20"
                  >
                    <td className="py-2.5 px-2">
                      <span className="font-medium text-main">{d.name}</span>
                      <span className="block text-[10.5px] text-muted-foreground">{d.code}</span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{d.province}</td>
                    <td className="py-2.5 px-2">
                      <span className="text-main">{d.contactPerson || '—'}</span>
                      {d.phone && <span className="block text-[10.5px] text-muted-foreground">{d.phone}</span>}
                    </td>
                    <td className="py-2.5 px-2"><StatusPill label={d.status} tone={STATUS_TONE[d.status]} /></td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{d.salesValue ? formatCurrency(d.salesValue, true) : '—'}</td>
                    <td className="py-2.5 px-2 tabular-nums">{formatDate(d.nextFollowUp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DepotDrawer depot={open} onClose={() => setOpen(null)} />
    </div>
  );
}
