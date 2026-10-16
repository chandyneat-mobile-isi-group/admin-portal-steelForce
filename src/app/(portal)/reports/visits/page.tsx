'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { FilterChip } from '@/components/forms/filter-chip';
import { SummaryCard } from '@/components/shared/summary-card';
import { ChartCard, LegendItem } from '@/components/shared/chart-card';
import { DataTable, type Column } from '@/components/tables/data-table';
import { MetaPill, ProgressBar, StatusPill } from '@/components/shared/status-pill';
import { repById } from '@/features/depots';
import { repPerformance, rowsForPeriod, visitTotals, visitsByDayFor, type RepPerformance } from '@/features/reports';
import { csvBlob, fileStamp } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import {
  CalendarRange,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  Percent,
  Route,
  Timer,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { RepAvatar, chartTheme, PROVINCES, TEAMS } from '@/features/planning';

const PERIODS = [
  { value: '7', label: 'This week' },
  { value: '30', label: 'This month' },
  { value: '90', label: 'This quarter' },
];

const opts = (v: readonly string[]) => v.map((x) => ({ value: x, label: x }));

export default function VisitReportPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState('30');
  const [province, setProvince] = useState('All');
  const [team, setTeam] = useState('All');

  useEffect(() => setMounted(true), []);
  const theme = chartTheme(resolvedTheme === 'dark');

  const rows = useMemo(
    () =>
      rowsForPeriod(
        repPerformance.filter((r) => {
          if (province !== 'All' && r.province !== province) return false;
          if (team !== 'All' && r.team !== team) return false;
          return true;
        }),
        period,
        'visits'
      ),
    [province, team, period]
  );

  const byDay = useMemo(() => visitsByDayFor(rows), [rows]);

  const totals = useMemo(() => visitTotals(rows), [rows]);

  const byRep = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.completedVisits - a.completedVisits)
        .slice(0, 10)
        .map((r) => ({ name: r.name.split(' ')[1] ?? r.name, completed: r.completedVisits, missed: r.missedVisits })),
    [rows]
  );

  const byProvince = useMemo(
    () =>
      PROVINCES.map((p) => {
        const inScope = rows.filter((r) => r.province === p);
        return {
          province: p,
          short: p === 'Phnom Penh' ? 'PP' : p.split(' ')[0],
          visits: inScope.reduce((sum, r) => sum + r.completedVisits, 0),
        };
      }).filter((r) => r.visits > 0),
    [rows]
  );

  const columns: Column<RepPerformance & { id: string }>[] = [
    {
      key: 'rep',
      header: 'Sales rep',
      width: 'w-[200px]',
      sortValue: (r) => r.name,
      cell: (r) => {
        const rep = repById(r.repId);
        return (
          <span className="flex items-center gap-2.5 min-w-0">
            {rep && <RepAvatar rep={rep} size="sm" showStatus={false} />}
            <span className="min-w-0">
              <span className="block font-semibold text-main truncate">{r.name}</span>
              <span className="block text-[10.5px] text-muted-foreground">{r.province}</span>
            </span>
          </span>
        );
      },
    },
    { key: 'planned', header: 'Planned', align: 'right', sortValue: (r) => r.plannedVisits, cell: (r) => r.plannedVisits },
    { key: 'completed', header: 'Completed', align: 'right', sortValue: (r) => r.completedVisits, cell: (r) => <span className="font-semibold">{r.completedVisits}</span> },
    {
      key: 'missed',
      header: 'Missed',
      align: 'right',
      sortValue: (r) => r.missedVisits,
      cell: (r) => (
        <span className={r.missedVisits > 10 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
          {r.missedVisits}
        </span>
      ),
    },
    {
      key: 'rate',
      header: 'Completion rate',
      align: 'right',
      sortValue: (r) => r.completionRate,
      cell: (r) => (
        <span className="inline-flex flex-col items-end gap-1 w-full">
          <span className="font-semibold">{r.completionRate}%</span>
          <ProgressBar
            value={r.completionRate}
            className="w-16"
            tone={r.completionRate >= 90 ? 'positive' : r.completionRate >= 78 ? 'info' : 'warning'}
          />
        </span>
      ),
    },
    { key: 'unique', header: 'Unique customers', align: 'right', secondary: true, sortValue: (r) => r.uniqueCustomers, cell: (r) => r.uniqueCustomers },
    {
      key: 'duration',
      header: 'Avg duration',
      align: 'right',
      secondary: true,
      sortValue: (r) => r.avgVisitMinutes,
      cell: (r) => `${r.avgVisitMinutes} min`,
    },
    {
      key: 'flag',
      header: 'Coverage',
      cell: (r) =>
        r.completionRate >= 90 ? (
          <StatusPill label="Strong" tone="positive" />
        ) : r.completionRate >= 78 ? (
          <StatusPill label="Adequate" tone="info" />
        ) : (
          <StatusPill label="Below plan" tone="warning" />
        ),
    },
  ];

  const tableRows = useMemo(() => rows.map((r) => ({ ...r, id: r.repId })), [rows]);

  const exportCsv = () => {
    const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'All time';
    saveBlob(
      csvBlob(
        ['Sales rep', 'Team', 'Province', 'Planned', 'Completed', 'Missed', 'Completion rate %', 'Unique customers', 'Assigned customers', 'Avg duration (min)', 'Period'],
        rows.map((r) => [r.name, r.team, r.province, r.plannedVisits, r.completedVisits, r.missedVisits, r.completionRate, r.uniqueCustomers, r.customers, r.avgVisitMinutes, periodLabel])
      ),
      `visit-report-${fileStamp()}.csv`
    );
    toast.success('Visit report exported', { description: `${rows.length} reps · ${periodLabel}` });
  };

  return (
    <PageBody>
      <PageHeader
        title="Visit Report"
        subtitle="Field coverage: how much of the plan was actually executed, and by whom."
        actions={
          <>
            <ActionButton icon={Download} onClick={exportCsv}>
              Export Excel
            </ActionButton>
            <ActionButton icon={FileText} tone="primary" onClick={() => window.print()}>
              Export PDF
            </ActionButton>
          </>
        }
      />

      <PageToolbar>
        <ToolbarRow>
          <FilterChip label="Period" icon={CalendarRange} value={period} options={PERIODS} onChange={setPeriod} allLabel="All time" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" />
          <FilterChip label="Team" icon={Users} value={team} options={opts(TEAMS)} onChange={setTeam} allLabel="All teams" />
        </ToolbarRow>
      </PageToolbar>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard index={0} label="Total visits" value={totals.total} icon={Route} color="#004A98" hint="Planned for the period" />
        <SummaryCard index={1} label="Completed" value={totals.completed} icon={CheckCircle2} color="#238036" progress={(totals.completed / Math.max(1, totals.total)) * 100} />
        <SummaryCard index={2} label="Still planned" value={totals.planned} icon={CalendarRange} color="#2571C2" />
        <SummaryCard index={3} label="Missed" value={totals.missed} icon={XCircle} color="#C33A50" />
        <SummaryCard index={4} label="Completion rate" value={totals.completionRate} suffix="%" icon={Percent} color="#B36211" progress={totals.completionRate} />
        <SummaryCard index={5} label="Customers visited" value={totals.uniqueCustomers} icon={UserCheck} color="#4A4092" hint="Unique accounts" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Completed versus missed by day"
          subtitle="Where the week loses coverage"
          icon={CalendarRange}
          height={260}
          delay={0.05}
          legend={
            <>
              <LegendItem color="#238036" label="Completed" />
              <LegendItem color="#C33A50" label="Missed" />
            </>
          }
          columns={[
            { key: 'day', label: 'Day' },
            { key: 'planned', label: 'Planned', align: 'right' },
            { key: 'completed', label: 'Completed', align: 'right' },
            { key: 'missed', label: 'Missed', align: 'right' },
          ]}
          rows={byDay.map((d) => ({
            day: d.day,
            planned: d.planned,
            completed: d.completed,
            missed: d.missed,
          }))}
          footnote="Segments carry a 2px surface gap and a legend — status is never colour-alone."
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byDay}
                margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: theme.grid }} tick={{ fill: theme.axis, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: theme.axis, fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<VisitTip theme={theme} />} cursor={{ fill: theme.primarySoft }} />
                <Bar dataKey="completed" stackId="v" fill="#238036" radius={[0, 0, 4, 4]} maxBarSize={44} stroke={theme.surface} strokeWidth={2} />
                <Bar dataKey="missed" stackId="v" fill="#C33A50" radius={[4, 4, 0, 0]} maxBarSize={44} stroke={theme.surface} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Visits by province"
          subtitle="Completed visits per territory"
          icon={MapPin}
          height={260}
          delay={0.1}
          columns={[
            { key: 'province', label: 'Province' },
            { key: 'visits', label: 'Visits', align: 'right' },
          ]}
          rows={byProvince.map((p) => ({ province: p.province, visits: p.visits }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProvince} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: theme.grid }} tick={{ fill: theme.axis, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: theme.axis, fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<VisitTip theme={theme} nameKey="province" />} cursor={{ fill: theme.primarySoft }} />
                <Bar dataKey="visits" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Visits by sales rep"
          subtitle="Top ten by completed visits"
          icon={Users}
          height={300}
          delay={0.15}
          legend={
            <>
              <LegendItem color="#238036" label="Completed" />
              <LegendItem color="#C33A50" label="Missed" />
            </>
          }
          columns={[
            { key: 'name', label: 'Rep' },
            { key: 'completed', label: 'Completed', align: 'right' },
            { key: 'missed', label: 'Missed', align: 'right' },
          ]}
          rows={byRep.map((r) => ({ name: r.name, completed: r.completed, missed: r.missed }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRep} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={theme.grid} horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={78} tick={{ fill: theme.axis, fontSize: 11 }} />
                <Tooltip content={<VisitTip theme={theme} nameKey="name" />} cursor={{ fill: theme.primarySoft }} />
                <Bar dataKey="completed" stackId="r" fill="#238036" radius={[4, 0, 0, 4]} maxBarSize={16} stroke={theme.surface} strokeWidth={2} />
                <Bar dataKey="missed" stackId="r" fill="#C33A50" radius={[0, 4, 4, 0]} maxBarSize={16} stroke={theme.surface} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Customer coverage"
          subtitle="Unique accounts visited per rep"
          icon={UserCheck}
          height={300}
          delay={0.2}
          columns={[
            { key: 'name', label: 'Rep' },
            { key: 'unique', label: 'Unique customers', align: 'right' },
            { key: 'assigned', label: 'Assigned', align: 'right' },
          ]}
          rows={rows.slice(0, 10).map((r) => ({
            name: r.name,
            unique: r.uniqueCustomers,
            assigned: r.customers,
          }))}
        >
          <div className="space-y-2 h-full overflow-y-auto pr-1">
            {rows.slice(0, 10).map((r) => {
              const pct = r.customers ? Math.min(100, (r.uniqueCustomers / r.customers) * 100) : 0;
              return (
                <div key={r.repId} className="flex items-center gap-3">
                  <span className="w-24 text-[11.5px] text-main truncate flex-shrink-0">{r.name}</span>
                  <ProgressBar value={pct} className="flex-1" tone={pct >= 70 ? 'positive' : pct >= 45 ? 'info' : 'warning'} />
                  <span className="w-20 text-right text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                    {r.uniqueCustomers}/{r.customers}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 className="text-[14px] font-bold text-main">Field activity by representative</h2>
          <MetaPill label={`${rows.length} reps in scope`} />
        </div>
        <DataTable
          rows={tableRows}
          columns={columns}
          pageSize={10}
          caption="Visit completion by representative"
          emptyTitle="No reps match these filters"
          emptyHint="Widen the province or team filter."
        />
      </div>
    </PageBody>
  );
}

function VisitTip({
  active,
  payload,
  theme,
  nameKey = 'day',
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; value: number; dataKey: string; color?: string }>;
  theme: ReturnType<typeof chartTheme>;
  nameKey?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg backdrop-blur-md"
      style={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
    >
      <p className="text-[11px] font-semibold text-main mb-0.5">{String(row[nameKey] ?? '')}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: entry.color }} />
          {entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
}
