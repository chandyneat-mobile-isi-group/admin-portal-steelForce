'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SummaryCard } from '@/components/shared/summary-card';
import { FilterChip } from '@/components/forms/filter-chip';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitCompareArrows,
  ListChecks,
  Navigation,
  Target,
  User,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusBadge, formatDuration, usePlanning, type StopView } from '@/features/planning';

const COMPLIANCE_TONE: Record<string, string> = {
  'On Time': 'text-emerald-600 dark:text-emerald-400',
  Delayed: 'text-amber-600 dark:text-amber-400',
  Missed: 'text-red-600 dark:text-red-400',
  Unplanned: 'text-violet-600 dark:text-violet-400',
};

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

function summarise(stops: StopView[]) {
  const planned = stops.length;
  const completed = stops.filter((s) => s.status === 'Completed');
  const visited = stops.filter((s) => s.status === 'Completed' || s.status === 'In Progress').length;
  const skipped = stops.filter((s) => s.status === 'Skipped').length;
  const onTime = completed.filter((s) => s.complianceStatus === 'On Time').length;
  const delayed = stops.filter((s) => s.complianceStatus === 'Delayed').length;
  const plannedMinutes = completed.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const actualMinutes = completed.reduce((sum, s) => sum + (s.actualMinutes ?? s.estimatedMinutes), 0);
  const plannedKm = completed.reduce((sum, s) => sum + s.distanceKm, 0);
  const actualKm = completed.reduce((sum, s) => sum + (s.actualDistanceKm ?? s.distanceKm), 0);
  const activities = stops.flatMap((s) => s.activities ?? []);
  const activitiesDone = activities.filter((a) => a.status === 'Completed').length;
  return {
    planned,
    completed: completed.length,
    visited,
    skipped,
    onTime,
    delayed,
    adherence: pct(completed.length, planned),
    onTimeRate: pct(onTime, completed.length),
    plannedMinutes,
    actualMinutes,
    plannedKm,
    actualKm,
    activities: activities.length,
    activitiesDone,
  };
}

/** How the day went against the plan — visits, timing, distance and tasks. */
export default function PlanVsActualPage() {
  const { stopViews, reps, selectStop } = usePlanning();
  const [repId, setRepId] = useState('All');

  const planned = useMemo(
    () => stopViews.filter((s) => s.repId && (repId === 'All' || s.repId === repId)),
    [stopViews, repId]
  );
  const total = useMemo(() => summarise(planned), [planned]);

  const perRep = useMemo(
    () =>
      reps
        .map((rep) => ({ rep, s: summarise(stopViews.filter((stop) => stop.repId === rep.id)) }))
        .filter((row) => row.s.planned > 0 && (repId === 'All' || row.rep.id === repId))
        .sort((a, b) => b.s.adherence - a.s.adherence),
    [reps, stopViews, repId]
  );

  const exceptions = useMemo(
    () =>
      planned
        .filter((s) => s.complianceStatus === 'Delayed' || s.complianceStatus === 'Missed' || s.status === 'Skipped')
        .sort((a, b) => (b.varianceMinutes ?? 999) - (a.varianceMinutes ?? 999)),
    [planned]
  );

  const repName = (id: string | null) => (id ? reps.find((r) => r.id === id)?.name ?? '—' : '—');

  return (
    <PageBody>
      <PageToolbar>
        <ToolbarRow>
          <FilterChip
            label="Sales rep"
            icon={User}
            value={repId}
            options={reps.map((r) => ({ value: r.id, label: r.name }))}
            onChange={setRepId}
            allLabel="All reps"
            searchable
          />
        </ToolbarRow>
      </PageToolbar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          index={0}
          label="Visits: planned vs done"
          value={total.completed}
          icon={Target}
          color="#004A98"
          hint={`${total.completed} of ${total.planned} planned · ${total.visited - total.completed} in progress`}
          progress={total.adherence}
        />
        <SummaryCard index={1} label="Plan adherence" value={total.adherence} suffix="%" icon={CheckCircle2} color="#2C9942" progress={total.adherence} />
        <SummaryCard
          index={2}
          label="On-time arrival"
          value={total.onTimeRate}
          suffix="%"
          icon={Clock}
          color="#D47C17"
          hint={`${total.delayed} delayed · ${total.skipped} skipped`}
          progress={total.onTimeRate}
        />
        <SummaryCard
          index={3}
          label="Activities done"
          value={pct(total.activitiesDone, total.activities)}
          suffix="%"
          icon={ListChecks}
          color="#5E53AE"
          hint={`${total.activitiesDone} of ${total.activities} tasks`}
          progress={pct(total.activitiesDone, total.activities)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompareBar
          icon={Clock}
          title="Time on site (completed visits)"
          planned={total.plannedMinutes}
          actual={total.actualMinutes}
          format={formatDuration}
        />
        <CompareBar
          icon={Navigation}
          title="Distance (completed visits)"
          planned={total.plannedKm}
          actual={total.actualKm}
          format={(v) => `${v.toFixed(1)} km`}
        />
      </div>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="By sales rep" subtitle="Planned stops against what was done" icon={GitCompareArrows} count={perRep.length} />
        {perRep.length === 0 ? (
          <EmptyState icon={GitCompareArrows} title="No planned routes" hint="Import call plans on Upload Call Plans first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12px]">
              <thead>
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold py-2 px-2">Sales rep</th>
                  <th className="text-right font-semibold py-2 px-2">Planned</th>
                  <th className="text-right font-semibold py-2 px-2">Completed</th>
                  <th className="text-right font-semibold py-2 px-2">Skipped</th>
                  <th className="text-right font-semibold py-2 px-2">On time</th>
                  <th className="text-left font-semibold py-2 px-2 w-[200px]">Adherence</th>
                </tr>
              </thead>
              <tbody>
                {perRep.map(({ rep, s }) => (
                  <tr key={rep.id} className="border-b border-surface last:border-0">
                    <td className="py-2.5 px-2 font-semibold text-main whitespace-nowrap">{rep.name}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.planned}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.completed}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.skipped}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.completed ? `${s.onTimeRate}%` : '—'}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.adherence >= 70 ? 'bg-emerald-500' : s.adherence >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${s.adherence}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-bold tabular-nums text-main">{s.adherence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Off-plan visits" subtitle="Delayed, missed or skipped against the plan" icon={AlertTriangle} count={exceptions.length} />
        {exceptions.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Everything is on plan" />
        ) : (
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full min-w-[820px] text-[12px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold py-2 px-2">Customer</th>
                  <th className="text-left font-semibold py-2 px-2">Sales rep</th>
                  <th className="text-left font-semibold py-2 px-2">Planned</th>
                  <th className="text-left font-semibold py-2 px-2">Actual</th>
                  <th className="text-left font-semibold py-2 px-2">Result</th>
                  <th className="text-left font-semibold py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((s) => (
                  <tr key={s.id} onClick={() => selectStop(s.id)} className="cursor-pointer border-b border-surface last:border-0 hover:bg-accent/20">
                    <td className="py-2.5 px-2">
                      <span className="font-medium text-main">{s.customer.name}</span>
                      <span className="block text-[10.5px] text-muted-foreground">{s.customer.code}</span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{repName(s.repId)}</td>
                    <td className="py-2.5 px-2 tabular-nums">{s.plannedStart}</td>
                    <td className="py-2.5 px-2 tabular-nums">{s.actualStart ?? '—'}</td>
                    <td className="py-2.5 px-2">
                      <span className={`inline-flex items-center gap-1 font-semibold ${COMPLIANCE_TONE[s.complianceStatus ?? 'Missed']}`}>
                        {s.status === 'Skipped' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                        {s.complianceStatus ?? 'Missed'}
                        {typeof s.varianceMinutes === 'number' && s.varianceMinutes > 0 && ` +${s.varianceMinutes} min`}
                      </span>
                      {s.skipReason && <span className="block text-[10.5px] text-muted-foreground">{s.skipReason}</span>}
                    </td>
                    <td className="py-2.5 px-2"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageBody>
  );
}

function CompareBar({
  icon: Icon,
  title,
  planned,
  actual,
  format,
}: {
  icon: typeof Clock;
  title: string;
  planned: number;
  actual: number;
  format: (value: number) => string;
}) {
  const max = Math.max(planned, actual, 1);
  const diff = actual - planned;
  const diffPct = planned ? Math.round((diff / planned) * 100) : 0;
  return (
    <Card className="p-5 rounded-card border-surface card-shadow">
      <SectionHeader title={title} icon={Icon} />
      {[
        { label: 'Planned', value: planned, color: 'bg-sky-300 dark:bg-sky-500/60' },
        { label: 'Actual', value: actual, color: 'bg-primary' },
      ].map((row) => (
        <div key={row.label} className="mb-3 last:mb-0">
          <div className="flex justify-between text-[11.5px] mb-1">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-bold text-main tabular-nums">{format(row.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className={`mt-3 text-[11px] font-semibold ${diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {diff === 0 ? 'Exactly on plan' : `${diff > 0 ? '+' : ''}${diffPct}% vs plan`}
      </p>
    </Card>
  );
}
