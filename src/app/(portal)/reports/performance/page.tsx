'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { SummaryCard } from '@/components/shared/summary-card';
import { DataTable, type Column } from '@/components/tables/data-table';
import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { MetaPill, ProgressBar, StatusPill, type Tone } from '@/components/shared/status-pill';
import { crmDepots, repById } from '@/features/depots';
import { activities } from '@/features/visits-management';
import { repPerformance, repTrend, salesTotals, visitTotals, type RepPerformance } from '@/features/reports';
import { formatCurrency, formatDate } from '@/lib/formatting';
import {
  Award,
  ClipboardList,
  DollarSign,
  Download,
  Gauge,
  MapPin,
  Percent,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { csvBlob, fileStamp } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import { RepAvatar, chartTheme, PROVINCES, TEAMS } from '@/features/planning';

const STATUS_TONE: Record<RepPerformance['status'], Tone> = {
  Excellent: 'positive',
  'On Track': 'info',
  'Needs Attention': 'warning',
  'At Risk': 'critical',
};

const opts = (v: readonly string[]) => v.map((x) => ({ value: x, label: x }));

export default function PerformanceReportPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('All');
  const [team, setTeam] = useState('All');
  const [status, setStatus] = useState('All');
  const [detail, setDetail] = useState<RepPerformance | null>(null);

  useEffect(() => setMounted(true), []);
  const theme = chartTheme(resolvedTheme === 'dark');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repPerformance.filter((r) => {
      if (province !== 'All' && r.province !== province) return false;
      if (team !== 'All' && r.team !== team) return false;
      if (status !== 'All' && r.status !== status) return false;
      if (q && !`${r.name} ${r.team} ${r.province}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, province, team, status]);

  const sales = useMemo(() => salesTotals(rows), [rows]);
  const visits = useMemo(() => visitTotals(rows), [rows]);

  const teamStats = useMemo(() => {
    const won = rows.reduce((sum, r) => sum + r.won, 0);
    const opps = rows.reduce((sum, r) => sum + r.opportunities, 0);
    const assigned = rows.reduce((sum, r) => sum + r.customers, 0);
    return {
      winRate: opps ? Math.round((won / opps) * 100) : 0,
      coverage: assigned ? Math.round((visits.uniqueCustomers / assigned) * 100) : 0,
      pipeline: rows.reduce((sum, r) => sum + r.pipeline, 0),
    };
  }, [rows, visits]);

  /** Ranked, so the table reads as a leaderboard rather than a directory. */
  const ranked = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.achievement - a.achievement)
        .map((r, i) => ({ ...r, id: r.repId, rank: i + 1 })),
    [rows]
  );

  const exportCsv = () => {
    saveBlob(
      csvBlob(
        ['Rank', 'Sales rep', 'Team', 'Province', 'Sales (USD)', 'Target (USD)', 'Achievement %', 'Customers', 'Visits completed', 'Visit completion %', 'Opportunities', 'Won', 'Win rate %', 'Pipeline (USD)', 'Performance'],
        ranked.map((r) => [r.rank, r.name, r.team, r.province, r.actual, r.target, r.achievement, r.customers, r.completedVisits, r.completionRate, r.opportunities, r.won, r.winRate, r.pipeline, r.status])
      ),
      `performance-scorecard-${fileStamp()}.csv`
    );
    toast.success('Scorecard exported', { description: `${ranked.length} reps saved as CSV.` });
  };

  const columns: Column<RepPerformance & { id: string; rank: number }>[] = [
    {
      key: 'rank',
      header: '#',
      width: 'w-12',
      sortValue: (r) => r.rank,
      cell: (r) => (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold tabular-nums ${
            r.rank <= 3 ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {r.rank}
        </span>
      ),
    },
    {
      key: 'rep',
      header: 'Sales rep',
      width: 'w-[190px]',
      sortValue: (r) => r.name,
      cell: (r) => {
        const rep = repById(r.repId);
        return (
          <span className="flex items-center gap-2.5 min-w-0">
            {rep && <RepAvatar rep={rep} size="sm" showStatus={false} />}
            <span className="min-w-0">
              <span className="block font-semibold text-main truncate">{r.name}</span>
              <span className="block text-[10.5px] text-muted-foreground truncate">
                {r.team} · {r.province}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: 'sales', header: 'Sales', align: 'right', sortValue: (r) => r.actual, cell: (r) => <span className="font-semibold">{formatCurrency(r.actual, true)}</span> },
    { key: 'target', header: 'Target', align: 'right', secondary: true, sortValue: (r) => r.target, cell: (r) => formatCurrency(r.target, true) },
    {
      key: 'achievement',
      header: 'Achievement',
      align: 'right',
      sortValue: (r) => r.achievement,
      cell: (r) => (
        <span className="inline-flex flex-col items-end gap-1 w-full">
          <span className="font-semibold">{r.achievement}%</span>
          <ProgressBar
            value={Math.min(100, r.achievement)}
            className="w-16"
            tone={r.achievement >= 110 ? 'positive' : r.achievement >= 92 ? 'info' : r.achievement >= 78 ? 'warning' : 'critical'}
          />
        </span>
      ),
    },
    { key: 'customers', header: 'Customers', align: 'right', secondary: true, sortValue: (r) => r.customers, cell: (r) => r.customers },
    { key: 'visits', header: 'Visits', align: 'right', secondary: true, sortValue: (r) => r.completedVisits, cell: (r) => r.completedVisits },
    { key: 'opps', header: 'Opps', align: 'right', secondary: true, sortValue: (r) => r.opportunities, cell: (r) => r.opportunities },
    { key: 'won', header: 'Won', align: 'right', secondary: true, sortValue: (r) => r.won, cell: (r) => r.won },
    { key: 'winRate', header: 'Win rate', align: 'right', sortValue: (r) => r.winRate, cell: (r) => `${r.winRate}%` },
    {
      key: 'status',
      header: 'Performance',
      sortValue: (r) => r.achievement,
      cell: (r) => <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />,
    },
  ];

  const detailRep = detail ? repById(detail.repId) : null;
  const trend = useMemo(() => (detail ? repTrend(detail.repId) : []), [detail]);
  const detailCustomers = useMemo(
    () =>
      detail
        ? [...crmDepots.filter((c) => c.repId === detail.repId)]
            .sort((a, b) => b.salesValue - a.salesValue)
            .slice(0, 5)
        : [],
    [detail]
  );
  const detailActivities = useMemo(
    () => (detail ? activities.filter((a) => a.repId === detail.repId).slice(0, 5) : []),
    [detail]
  );

  /** Weakest dimensions first — the point of the drawer is what to fix. */
  const improvements = useMemo(() => {
    if (!detail) return [];
    const notes: string[] = [];
    if (detail.achievement < 92) notes.push(`Sales at ${detail.achievement}% of target — ${formatCurrency(detail.target - detail.actual, true)} behind plan.`);
    if (detail.completionRate < 85) notes.push(`Visit completion at ${detail.completionRate}%, with ${detail.missedVisits} missed visits.`);
    if (detail.winRate < 45) notes.push(`Win rate at ${detail.winRate}% — review qualification before quoting.`);
    if (detail.customers > 0 && detail.uniqueCustomers / detail.customers < 0.5) {
      notes.push(`Only ${detail.uniqueCustomers} of ${detail.customers} assigned accounts visited this period.`);
    }
    if (notes.length === 0) notes.push('Performing at or above plan across every measured dimension.');
    return notes;
  }, [detail]);

  return (
    <PageBody>
      <PageHeader
        title="Sales Performance"
        subtitle="Team scorecard ranked by target achievement. Open a rep for their full picture."
        actions={
          <ActionButton icon={Download} tone="primary" onClick={exportCsv}>
            Export
          </ActionButton>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard index={0} label="Team sales" value={Math.round(sales.totalSales / 1000)} prefix="$" suffix="k" icon={DollarSign} color="#004A98" />
        <SummaryCard index={1} label="Target achievement" value={sales.achievement} suffix="%" icon={Percent} color="#238036" progress={Math.min(100, sales.achievement)} />
        <SummaryCard index={2} label="Win rate" value={teamStats.winRate} suffix="%" icon={Award} color="#4A4092" progress={teamStats.winRate} />
        <SummaryCard index={3} label="Customer coverage" value={teamStats.coverage} suffix="%" icon={UserCheck} color="#2571C2" progress={teamStats.coverage} />
        <SummaryCard index={4} label="Visit completion" value={visits.completionRate} suffix="%" icon={Target} color="#B36211" progress={visits.completionRate} />
        <SummaryCard index={5} label="Pipeline" value={Math.round(teamStats.pipeline / 1000)} prefix="$" suffix="k" icon={TrendingUp} color="#C33A50" />
      </div>

      <PageToolbar>
        <ToolbarRow>
          <SearchBar value={search} onChange={setSearch} placeholder="Search sales rep…" className="w-full sm:w-[260px]" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" />
          <FilterChip label="Team" icon={Users} value={team} options={opts(TEAMS)} onChange={setTeam} allLabel="All teams" />
          <FilterChip
            label="Performance"
            icon={Gauge}
            value={status}
            options={opts(['Excellent', 'On Track', 'Needs Attention', 'At Risk'])}
            onChange={setStatus}
            allLabel="Any performance"
          />
        </ToolbarRow>
      </PageToolbar>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-main tabular-nums">{rows.length}</span> reps ranked by
          target achievement
        </p>
        <MetaPill label="Click a row for the rep scorecard" />
      </div>

      <DataTable
        rows={ranked}
        columns={columns}
        onRowClick={setDetail}
        pageSize={12}
        caption="Sales representative performance"
        emptyTitle="No reps match these filters"
        emptyHint="Widen the province, team or performance filter."
      />

      <DrawerPanel
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        subtitle={detail ? `${detail.team} · ${detail.province}` : ''}
        icon={Gauge}
        width="w-full sm:w-[480px] lg:w-[540px]"
      >
        {detail && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill label={detail.status} tone={STATUS_TONE[detail.status]} />
              <MetaPill label={`${detail.achievement}% of target`} />
              <MetaPill label={`${detail.customers} accounts`} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Tile label="Sales" value={formatCurrency(detail.actual, true)} />
              <Tile label="Pipeline" value={formatCurrency(detail.pipeline, true)} />
              <Tile label="Win rate" value={`${detail.winRate}%`} />
            </div>

            <DrawerSection title="Sales trend">
              <div className="rounded-card border border-surface p-3" style={{ height: 180 }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="rep-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: theme.grid }} tick={{ fill: theme.axis, fontSize: 10 }} interval={1} />
                      <YAxis tickLine={false} axisLine={false} width={42} tick={{ fill: theme.axis, fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        cursor={{ stroke: theme.axis, strokeWidth: 1 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload as { month: string; sales: number };
                          return (
                            <div
                              className="rounded-xl px-3 py-2 shadow-lg backdrop-blur-md"
                              style={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
                            >
                              <p className="text-[11px] font-semibold text-main">{row.month}</p>
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                {formatCurrency(row.sales)}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="sales" stroke={theme.primary} strokeWidth={2} fill="url(#rep-trend)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </DrawerSection>

            <DrawerSection title="Target achievement">
              <div className="rounded-card border border-surface p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">Sales versus target</span>
                    <span className="font-semibold text-main tabular-nums">
                      {formatCurrency(detail.actual, true)} / {formatCurrency(detail.target, true)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.min(100, detail.achievement)}
                    tone={detail.achievement >= 100 ? 'positive' : detail.achievement >= 85 ? 'info' : 'warning'}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground">Visit completion</span>
                    <span className="font-semibold text-main tabular-nums">
                      {detail.completedVisits} / {detail.plannedVisits}
                    </span>
                  </div>
                  <ProgressBar value={detail.completionRate} tone={detail.completionRate >= 85 ? 'positive' : 'warning'} />
                </div>
              </div>
            </DrawerSection>

            <DrawerSection title="Activity summary">
              <div className="rounded-card border border-surface px-3">
                <FieldRow label="Orders" value={String(detail.orders)} />
                <FieldRow label="Opportunities" value={String(detail.opportunities)} />
                <FieldRow label="Won" value={String(detail.won)} />
                <FieldRow label="Unique customers visited" value={`${detail.uniqueCustomers} of ${detail.customers}`} />
                <FieldRow label="Average visit duration" value={`${detail.avgVisitMinutes} min`} />
                <FieldRow label="Growth" value={`${detail.growth >= 0 ? '+' : ''}${detail.growth}%`} />
              </div>
            </DrawerSection>

            <DrawerSection title="Top customers">
              <div className="space-y-1.5">
                {detailCustomers.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-card border border-surface">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-medium text-main truncate">{c.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{c.province}</span>
                    </span>
                    <span className="text-[11.5px] font-semibold text-main tabular-nums flex-shrink-0">
                      {formatCurrency(c.salesValue, true)}
                    </span>
                  </div>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Recent activities">
              <div className="space-y-1.5">
                {detailActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-card border border-surface">
                    <ClipboardList size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-medium text-main truncate">{a.title}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {a.depotName} · {formatDate(a.date)}
                      </span>
                    </span>
                    <StatusPill size="sm" label={a.status} tone={a.status === 'Completed' ? 'positive' : a.status === 'Overdue' ? 'critical' : 'info'} />
                  </div>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Areas for improvement">
              <ul className="space-y-2 rounded-card border border-surface p-3">
                {improvements.map((note) => (
                  <li key={note} className="flex items-start gap-2 text-[11.5px] text-main leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[6px] flex-shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </DrawerSection>
          </>
        )}
      </DrawerPanel>
    </PageBody>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground mb-1">{label}</p>
      <p className="text-[13px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
