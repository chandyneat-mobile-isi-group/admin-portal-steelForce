'use client';

import { PageBody } from '@/components/layout/page-layout';
import { Card } from '@/components/ui/card';
import { ChartCard, LegendItem } from '@/components/shared/chart-card';
import { SectionHeader } from '@/components/layout/section-header';
import { SummaryCard } from '@/components/shared/summary-card';
import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Activity,
  BarChart3,
  Clock,
  ClipboardList,
  Layers,
  MapPin,
  Navigation,
  Percent,
  Table2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  FilterBar,
  RepAvatar,
  usePlanning,
  chartTheme,
  STATUS_FILL,
  STATUS_STACK_ORDER,
  formatDuration,
  formatKm,
  CUSTOMER_TYPES,
  PROVINCES,
  type StopStatus,
} from '@/features/planning';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function PlanningAnalyticsPage() {
  const { filtered, kpis, reps, routeFor, workloadFor } = usePlanning();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Recharts needs concrete colours, and the theme is only known on the client.
  useEffect(() => setMounted(true), []);
  const theme = chartTheme(resolvedTheme === 'dark');

  const byProvince = useMemo(
    () =>
      PROVINCES.map((province) => ({
        province,
        short: province === 'Phnom Penh' ? 'PP' : province.split(' ')[0],
        stops: filtered.filter((s) => s.customer.province === province).length,
        assigned: filtered.filter((s) => s.customer.province === province && s.repId).length,
      })),
    [filtered]
  );

  const byStatus = useMemo(
    () =>
      STATUS_STACK_ORDER.map((status) => ({
        status,
        count: filtered.filter((s) => s.status === status).length,
      })).filter((row) => row.count > 0),
    [filtered]
  );

  const statusTotal = byStatus.reduce((sum, r) => sum + r.count, 0) || 1;

  const byHour = useMemo(
    () =>
      HOURS.map((hour) => ({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        stops: filtered.filter((s) => Number(s.plannedStart.split(':')[0]) === hour).length,
      })),
    [filtered]
  );

  const workload = useMemo(
    () =>
      reps
        .map((rep) => ({
          rep,
          name: rep.name,
          stops: workloadFor(rep.id).count,
          km: routeFor(rep.id).distanceKm,
        }))
        .filter((row) => row.stops > 0)
        .sort((a, b) => b.stops - a.stops)
        .slice(0, 10),
    [reps, workloadFor, routeFor]
  );

  const byType = useMemo(
    () =>
      CUSTOMER_TYPES.map((type) => {
        const rows = filtered.filter((s) => s.customer.type === type);
        const assigned = rows.filter((s) => s.repId).length;
        return {
          type,
          stops: rows.length,
          assigned,
          coverage: rows.length ? Math.round((assigned / rows.length) * 100) : 0,
          avgMinutes: rows.length
            ? Math.round(rows.reduce((sum, s) => sum + s.estimatedMinutes, 0) / rows.length)
            : 0,
        };
      }).sort((a, b) => b.stops - a.stops),
    [filtered]
  );

  const peak = byHour.reduce((max, row) => (row.stops > max.stops ? row : max), byHour[0]);

  return (
    <PageBody>
      <FilterBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard index={0} label="Stops in scope" value={filtered.length} icon={ClipboardList} color="#004A98" hint="Matching the filters above" />
        <SummaryCard index={1} label="Coverage" value={kpis.coverage} suffix="%" icon={Percent} color="#238036" progress={kpis.coverage} />
        <SummaryCard index={2} label="Planned distance" value={kpis.totalDistance} suffix=" km" icon={Navigation} color="#0D63B5" hint={`${kpis.avgDistance} km average per stop`} />
        <SummaryCard index={3} label="Time on site" value={Math.round(kpis.plannedMinutes / 60)} suffix=" h" icon={Clock} color="#B36211" hint={formatDuration(kpis.plannedMinutes)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Stops per province — one series, one hue */}
        <ChartCard
          title="Stops by province"
          subtitle="Where today's work sits"
          icon={MapPin}
          delay={0.05}
          columns={[
            { key: 'province', label: 'Province' },
            { key: 'stops', label: 'Stops', align: 'right' },
            { key: 'assigned', label: 'Assigned', align: 'right' },
          ]}
          rows={byProvince.map((r) => ({
            province: r.province,
            stops: r.stops,
            assigned: r.assigned,
          }))}
          footnote="Bar length encodes the stop count; colour carries no extra meaning."
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProvince} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="short"
                  tickLine={false}
                  axisLine={{ stroke: theme.grid }}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: theme.primarySoft }}
                  content={<PlanTooltip theme={theme} unit="stops" nameKey="province" />}
                />
                <Bar dataKey="stops" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Planned arrivals — single series area */}
        <ChartCard
          title="Planned arrivals through the day"
          subtitle={`Peak at ${peak?.label ?? '—'} with ${peak?.stops ?? 0} stops`}
          icon={Clock}
          delay={0.1}
          columns={[
            { key: 'label', label: 'Hour' },
            { key: 'stops', label: 'Stops planned', align: 'right' },
          ]}
          rows={byHour.map((r) => ({ label: r.label, stops: r.stops }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byHour} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="arrivals-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: theme.grid }}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                  interval={1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: theme.axis, strokeWidth: 1 }}
                  content={<PlanTooltip theme={theme} unit="stops" nameKey="label" />}
                />
                <Area
                  type="monotone"
                  dataKey="stops"
                  stroke={theme.primary}
                  strokeWidth={2}
                  fill="url(#arrivals-fill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface, fill: theme.primary }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Plan composition — HTML stacked bar so segments get real 2px surface gaps */}
      <ChartCard
        title="Plan composition"
        subtitle="Every stop in scope by status"
        icon={Layers}
        height={120}
        delay={0.15}
        legend={byStatus.map((row) => (
          <LegendItem
            key={row.status}
            color={STATUS_FILL[row.status]}
            label={row.status}
            value={`${row.count} · ${Math.round((row.count / statusTotal) * 100)}%`}
          />
        ))}
        columns={[
          { key: 'status', label: 'Status' },
          { key: 'count', label: 'Stops', align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
        ]}
        rows={byStatus.map((r) => ({
          status: r.status,
          count: r.count,
          share: `${Math.round((r.count / statusTotal) * 100)}%`,
        }))}
        footnote="Segments are separated by a 2px surface gap and labelled directly — status is never encoded by colour alone."
      >
        <div className="flex items-center h-[72px] gap-[2px]">
          {byStatus.map((row, i) => {
            const share = (row.count / statusTotal) * 100;
            return (
              <motion.div
                key={row.status}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${share}%`, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: EASE }}
                className="h-full rounded-[4px] flex items-center justify-center overflow-hidden group relative"
                style={{ background: STATUS_FILL[row.status] }}
                title={`${row.status}: ${row.count} stops`}
              >
                {share > 9 && (
                  <span className="text-[11px] font-bold text-white tabular-nums px-1 truncate">
                    {Math.round(share)}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Rep workload ranking */}
        <ChartCard
          title="Busiest routes"
          subtitle="Top 10 sales reps by assigned stops"
          icon={Users}
          height={320}
          delay={0.2}
          columns={[
            { key: 'name', label: 'Sales rep' },
            { key: 'stops', label: 'Stops', align: 'right' },
            { key: 'km', label: 'Route', align: 'right' },
          ]}
          rows={workload.map((r) => ({
            name: r.name,
            stops: r.stops,
            km: formatKm(r.km),
          }))}
        >
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workload}
                layout="vertical"
                margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
              >
                <CartesianGrid stroke={theme.grid} strokeWidth={1} horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={104}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: theme.primarySoft }}
                  content={<PlanTooltip theme={theme} unit="stops" nameKey="name" />}
                />
                <Bar dataKey="stops" fill={theme.primary} radius={[0, 4, 4, 0]} maxBarSize={18}>
                  <LabelList
                    dataKey="stops"
                    position="right"
                    style={{ fill: theme.axis, fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Rep leaderboard — the identity detail a bar chart can't carry */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
        >
          <Card className="p-6 rounded-card border-surface card-shadow h-full">
            <SectionHeader title="Route detail" subtitle="Same ranking, with route metrics" icon={Activity} />
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {workload.map((row, i) => {
                const route = routeFor(row.rep.id);
                return (
                  <div
                    key={row.rep.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/40 transition-colors"
                  >
                    <span className="w-5 text-[11px] font-bold text-muted-foreground tabular-nums flex-shrink-0">
                      {i + 1}
                    </span>
                    <RepAvatar rep={row.rep} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-main truncate">{row.rep.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {row.rep.team} · {row.rep.province}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11.5px] font-semibold text-main tabular-nums">
                        {row.stops} stops
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {formatKm(route.distanceKm)} · {formatDuration(route.totalMinutes)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {workload.length === 0 && (
                <p className="text-[11.5px] text-muted-foreground text-center py-8">
                  No routes match the current filters
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Customer types — eight classes, so a table rather than eight colours */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
      >
        <Card className="p-6 rounded-card border-surface card-shadow">
          <SectionHeader
            title="Coverage by customer type"
            subtitle="Eight classes carry more meaning in a table than in eight colours"
            icon={Table2}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] min-w-[520px]">
              <thead>
                <tr className="border-b border-surface">
                  <th className="py-2 px-2 text-left font-semibold text-muted-foreground">Customer type</th>
                  <th className="py-2 px-2 text-right font-semibold text-muted-foreground">Stops</th>
                  <th className="py-2 px-2 text-right font-semibold text-muted-foreground">Assigned</th>
                  <th className="py-2 px-2 text-right font-semibold text-muted-foreground">Avg on site</th>
                  <th className="py-2 px-2 text-right font-semibold text-muted-foreground w-[180px]">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((row, i) => (
                  <tr key={row.type} className="border-b border-surface last:border-0">
                    <td className="py-2.5 px-2 text-main font-medium">{row.type}</td>
                    <td className="py-2.5 px-2 text-right text-main tabular-nums">{row.stops}</td>
                    <td className="py-2.5 px-2 text-right text-main tabular-nums">{row.assigned}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground tabular-nums">
                      {row.avgMinutes ? `${row.avgMinutes}m` : '—'}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 h-1.5 rounded-full bg-muted/70 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: theme.primary }}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.coverage}%` }}
                            transition={{ duration: 0.7, delay: 0.3 + i * 0.04, ease: EASE }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-main tabular-nums w-9 text-right">
                          {row.coverage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <p className="text-[10.5px] text-muted-foreground flex items-center gap-1.5 pb-2">
        <BarChart3 size={12} />
        All figures are generated demo data and re-scope to the filter bar above.
      </p>
    </PageBody>
  );
}

/** Tooltip styled to the portal's glass surfaces rather than Recharts defaults. */
function PlanTooltip({
  active,
  payload,
  theme,
  unit,
  nameKey,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; value: number }>;
  theme: ReturnType<typeof chartTheme>;
  unit: string;
  nameKey: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg backdrop-blur-md"
      style={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
    >
      <p className="text-[11px] font-semibold text-main">{String(row[nameKey] ?? '')}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}
