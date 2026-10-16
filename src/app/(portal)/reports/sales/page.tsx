'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { FilterChip } from '@/components/forms/filter-chip';
import { SummaryCard } from '@/components/shared/summary-card';
import { ChartCard, LegendItem } from '@/components/shared/chart-card';
import { DataTable, type Column } from '@/components/tables/data-table';
import { MetaPill, ProgressBar, StatusPill, type Tone } from '@/components/shared/status-pill';
import { repById } from '@/features/depots';
import {
  repPerformance,
  rowsForPeriod,
  salesByCategoryFor,
  salesByProvinceFor,
  salesShare,
  salesTotals,
  salesTrendFor,
  topCustomersFor,
  type RepPerformance,
} from '@/features/reports';
import { csvBlob, fileStamp } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import { formatCurrency } from '@/lib/formatting';
import {
  BarChart3,
  CalendarRange,
  DollarSign,
  Download,
  FileText,
  MapPin,
  Package,
  Percent,
  ShoppingCart,
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
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { RepAvatar, chartTheme, PROVINCES, TEAMS } from '@/features/planning';

const PERIODS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last quarter' },
  { value: '365', label: 'Last 12 months' },
];

const STATUS_TONE: Record<RepPerformance['status'], Tone> = {
  Excellent: 'positive',
  'On Track': 'info',
  'Needs Attention': 'warning',
  'At Risk': 'critical',
};

const opts = (v: readonly string[]) => v.map((x) => ({ value: x, label: x }));

export default function SalesReportPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState('365');
  const [province, setProvince] = useState('All');
  const [team, setTeam] = useState('All');

  useEffect(() => setMounted(true), []);
  const theme = chartTheme(resolvedTheme === 'dark');

  const inScope = useMemo(
    () =>
      repPerformance.filter((r) => {
        if (province !== 'All' && r.province !== province) return false;
        if (team !== 'All' && r.team !== team) return false;
        return true;
      }),
    [province, team]
  );

  // Every figure, chart and table on the page follows the period and scope filters.
  const rows = useMemo(() => rowsForPeriod(inScope, period, 'sales'), [inScope, period]);
  const share = useMemo(() => salesShare(inScope), [inScope]);
  const salesTrend = useMemo(() => salesTrendFor(period, share), [period, share]);
  const salesByProvince = useMemo(() => salesByProvinceFor(rows), [rows]);
  const salesByCategory = useMemo(() => salesByCategoryFor(period, share), [period, share]);
  const topCustomers = useMemo(() => topCustomersFor(inScope.map((r) => r.repId), period), [inScope, period]);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'All time';

  const exportCsv = () => {
    saveBlob(
      csvBlob(
        ['Sales rep', 'Team', 'Province', 'Target (USD)', 'Actual (USD)', 'Achievement %', 'Orders', 'Growth %', 'Status', 'Period'],
        rows.map((r) => [r.name, r.team, r.province, r.target, r.actual, r.achievement, r.orders, r.growth, r.status, periodLabel])
      ),
      `sales-report-${fileStamp()}.csv`
    );
    toast.success('Sales report exported', { description: `${rows.length} reps · ${periodLabel}` });
  };

  const totals = useMemo(() => salesTotals(rows), [rows]);

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
              <span className="block text-[10.5px] text-muted-foreground">{r.team}</span>
            </span>
          </span>
        );
      },
    },
    { key: 'target', header: 'Target', align: 'right', sortValue: (r) => r.target, cell: (r) => formatCurrency(r.target, true) },
    { key: 'actual', header: 'Actual', align: 'right', sortValue: (r) => r.actual, cell: (r) => <span className="font-semibold">{formatCurrency(r.actual, true)}</span> },
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
            tone={r.achievement >= 100 ? 'positive' : r.achievement >= 85 ? 'info' : 'warning'}
          />
        </span>
      ),
    },
    { key: 'orders', header: 'Orders', align: 'right', secondary: true, sortValue: (r) => r.orders, cell: (r) => r.orders },
    {
      key: 'growth',
      header: 'Growth',
      align: 'right',
      sortValue: (r) => r.growth,
      cell: (r) => (
        <span
          className={
            r.growth >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'
          }
        >
          {r.growth >= 0 ? '+' : ''}
          {r.growth}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />,
    },
  ];

  const tableRows = useMemo(() => rows.map((r) => ({ ...r, id: r.repId })), [rows]);

  return (
    <PageBody>
      <PageHeader
        title="Sales Report"
        subtitle="Revenue against target across the team, by territory and product category."
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
        meta={<MetaPill label="Figures are demo data" />}
      />

      <PageToolbar>
        <ToolbarRow>
          <FilterChip label="Period" icon={CalendarRange} value={period} options={PERIODS} onChange={setPeriod} allLabel="All time" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" />
          <FilterChip label="Team" icon={Users} value={team} options={opts(TEAMS)} onChange={setTeam} allLabel="All teams" />
        </ToolbarRow>
      </PageToolbar>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <SummaryCard index={0} label="Total sales" value={Math.round(totals.totalSales / 1000)} prefix="$" suffix="k" icon={DollarSign} color="#004A98" />
        <SummaryCard index={1} label="Target" value={Math.round(totals.target / 1000)} prefix="$" suffix="k" icon={Target} color="#7D8BA0" />
        <SummaryCard index={2} label="Achievement" value={totals.achievement} suffix="%" icon={Percent} color="#238036" progress={Math.min(100, totals.achievement)} />
        <SummaryCard index={3} label="Growth" value={totals.growth} suffix="%" icon={TrendingUp} color="#4A4092" hint="vs previous period" />
        <SummaryCard index={4} label="Orders" value={totals.orders} icon={ShoppingCart} color="#2571C2" />
        <SummaryCard index={5} label="Avg order value" value={totals.averageOrder} prefix="$" icon={BarChart3} color="#B36211" />
        <SummaryCard index={6} label="Gross margin" value={totals.grossMargin} suffix="%" icon={Package} color="#C33A50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Sales versus target"
          subtitle={period === '30' ? 'Weekly, last 30 days' : period === '90' ? 'Monthly, last quarter' : 'Twelve-month trend'}
          icon={TrendingUp}
          height={280}
          delay={0.05}
          legend={
            <>
              <LegendItem color={theme.primary} label="Actual sales" />
              <LegendItem color="#ADBACA" label="Target" />
            </>
          }
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'sales', label: 'Sales', align: 'right' },
            { key: 'target', label: 'Target', align: 'right' },
          ]}
          rows={salesTrend.map((t) => ({
            month: t.month,
            sales: formatCurrency(t.sales, true),
            target: formatCurrency(t.target, true),
          }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: theme.grid }} tick={{ fill: theme.axis, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={46} tick={{ fill: theme.axis, fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<ChartTip theme={theme} nameKey="month" currency />} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
                <Line type="monotone" dataKey="target" stroke="#ADBACA" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="sales" stroke={theme.primary} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Sales by province"
          subtitle="Where the revenue comes from"
          icon={MapPin}
          height={280}
          delay={0.1}
          columns={[
            { key: 'province', label: 'Province' },
            { key: 'sales', label: 'Sales', align: 'right' },
            { key: 'customers', label: 'Customers', align: 'right' },
          ]}
          rows={salesByProvince.map((p) => ({
            province: p.province,
            sales: formatCurrency(p.sales, true),
            customers: p.customers,
          }))}
          footnote="Bar length encodes revenue; colour carries no extra meaning."
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByProvince} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: theme.grid }} tick={{ fill: theme.axis, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={46} tick={{ fill: theme.axis, fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<ChartTip theme={theme} nameKey="province" currency />} cursor={{ fill: theme.primarySoft }} />
                <Bar dataKey="sales" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Sales by product category"
          subtitle={periodLabel}
          icon={Package}
          height={280}
          delay={0.15}
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
          ]}
          rows={salesByCategory.map((c) => ({ category: c.category, revenue: formatCurrency(c.revenue, true) }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCategory} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={theme.grid} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={120} tick={{ fill: theme.axis, fontSize: 11 }} />
                <Tooltip content={<ChartTip theme={theme} nameKey="category" currency valueKey="revenue" />} cursor={{ fill: theme.primarySoft }} />
                <Bar dataKey="revenue" fill={theme.primary} radius={[0, 4, 4, 0]} maxBarSize={20}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => formatCurrency(v, true)} style={{ fill: theme.axis, fontSize: 10.5, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top customers"
          subtitle={`By revenue · ${periodLabel.toLowerCase()}`}
          icon={Users}
          height={280}
          delay={0.2}
          columns={[
            { key: 'name', label: 'Customer' },
            { key: 'province', label: 'Province' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
          ]}
          rows={topCustomers.map((c) => ({
            name: c.name,
            province: c.province,
            revenue: formatCurrency(c.revenue, true),
          }))}
        >
          <div className="space-y-1.5 h-full overflow-y-auto pr-1">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/40 transition-colors">
                <span className="w-5 text-[11px] font-bold text-muted-foreground tabular-nums flex-shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-main truncate">{c.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {c.province} · {c.orders} orders
                  </span>
                </span>
                <span className="text-[12px] font-semibold text-main tabular-nums flex-shrink-0">
                  {formatCurrency(c.revenue, true)}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 className="text-[14px] font-bold text-main">Performance by sales rep</h2>
          <MetaPill label={`${rows.length} reps in scope`} />
        </div>
        <DataTable
          rows={tableRows}
          columns={columns}
          pageSize={10}
          caption="Sales performance by representative"
          emptyTitle="No reps match these filters"
          emptyHint="Widen the province or team filter."
        />
      </div>
    </PageBody>
  );
}

/** Shared tooltip so all four charts read identically. */
function ChartTip({
  active,
  payload,
  theme,
  nameKey,
  currency,
  valueKey,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; value: number; dataKey: string }>;
  theme: ReturnType<typeof chartTheme>;
  nameKey: string;
  currency?: boolean;
  valueKey?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg backdrop-blur-md"
      style={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
    >
      <p className="text-[11px] font-semibold text-main">{String(row[nameKey] ?? '')}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[11px] text-muted-foreground tabular-nums">
          {valueKey ? '' : `${entry.dataKey}: `}
          {currency ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}
