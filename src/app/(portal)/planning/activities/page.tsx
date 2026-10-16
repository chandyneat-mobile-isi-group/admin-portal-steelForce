'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SummaryCard } from '@/components/shared/summary-card';
import { FilterChip } from '@/components/forms/filter-chip';
import { SearchBar } from '@/components/forms/search-bar';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, ListChecks, Tag, Timer, User, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PLANNED_ACTIVITY_TYPES, usePlanning, type PlannedActivity } from '@/features/planning';

const ACTIVITY_STATUSES = ['Pending', 'In Progress', 'Completed', 'Skipped'] as const;

const STATUS_TONE: Record<PlannedActivity['status'], string> = {
  Pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  'In Progress': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Skipped: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

/** Every task the reps are expected to carry out at their stops. */
export default function PlannedActivitiesPage() {
  const { stopViews, reps, selectStop, toggleActivityStatus, live } = usePlanning();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [repId, setRepId] = useState('All');

  const repName = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps]);

  const rows = useMemo(
    () =>
      stopViews
        .filter((stop) => stop.repId)
        .flatMap((stop) => (stop.activities ?? []).map((activity) => ({ stop, activity }))),
    [stopViews]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ stop, activity }) => {
      if (type !== 'All' && activity.type !== type) return false;
      if (status !== 'All' && activity.status !== status) return false;
      if (repId !== 'All' && stop.repId !== repId) return false;
      if (q && !`${activity.title} ${stop.customer.name} ${stop.customer.code}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, query, type, status, repId]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.activity.status === 'Completed').length;
    const required = rows.filter((r) => r.activity.required).length;
    const minutes = rows.reduce((sum, r) => sum + r.activity.estimatedMinutes, 0);
    return { total: rows.length, completed, required, minutes };
  }, [rows]);

  const byType = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    rows.forEach(({ activity }) => {
      const entry = map.get(activity.type) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (activity.status === 'Completed') entry.completed += 1;
      map.set(activity.type, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  return (
    <PageBody>
      <PageToolbar>
        <ToolbarRow>
          <SearchBar value={query} onChange={setQuery} placeholder="Search activity or customer…" className="w-full sm:w-[300px]" />
          <FilterChip label="Activity" icon={Tag} value={type} options={opts(PLANNED_ACTIVITY_TYPES)} onChange={setType} allLabel="All activities" />
          <FilterChip label="Status" icon={CheckCircle2} value={status} options={opts(ACTIVITY_STATUSES)} onChange={setStatus} allLabel="Any status" />
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
        <SummaryCard index={0} label="Planned activities" value={stats.total} icon={ListChecks} color="#004A98" hint="On assigned stops" />
        <SummaryCard
          index={1}
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="#2C9942"
          progress={stats.total ? (stats.completed / stats.total) * 100 : 0}
        />
        <SummaryCard index={2} label="Required" value={stats.required} icon={Users} color="#D47C17" hint="Must be done on the visit" />
        <SummaryCard index={3} label="Planned time" value={Math.round(stats.minutes / 60)} suffix=" h" icon={Timer} color="#5E53AE" />
      </div>

      {byType.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {byType.map(([name, entry]) => (
            <button
              key={name}
              type="button"
              onClick={() => setType(type === name ? 'All' : name)}
              className={`rounded-card border p-3 text-left transition-colors ${
                type === name ? 'border-primary bg-primary/5' : 'border-surface bg-card hover:bg-accent/30'
              }`}
            >
              <p className="text-[11px] text-muted-foreground truncate">{name}</p>
              <p className="text-[16px] font-bold text-main tabular-nums">{entry.total}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(entry.completed / entry.total) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">{entry.completed} done</p>
            </button>
          ))}
        </div>
      )}

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader
          title="Activity list"
          subtitle={live ? 'From the published routes' : 'Click a status to move it on: Pending → In Progress → Completed'}
          icon={ListChecks}
          count={visible.length}
        />
        {visible.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={rows.length === 0 ? 'No planned activities' : 'No activity matches'}
            hint={rows.length === 0 ? 'Activities appear once stops with tasks are assigned to reps.' : 'Adjust the filters above.'}
          />
        ) : (
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full min-w-[860px] text-[12px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold py-2 px-2">Activity</th>
                  <th className="text-left font-semibold py-2 px-2">Customer</th>
                  <th className="text-left font-semibold py-2 px-2">Sales rep</th>
                  <th className="text-left font-semibold py-2 px-2">Planned</th>
                  <th className="text-left font-semibold py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ stop, activity }) => (
                  <tr key={`${stop.id}-${activity.id}`} className="border-b border-surface last:border-0 hover:bg-accent/20">
                    <td className="py-2.5 px-2 max-w-[300px]">
                      <span className="font-semibold text-main">{activity.title}</span>
                      {activity.required && (
                        <span className="ml-1.5 text-[9.5px] font-bold uppercase text-red-600 dark:text-red-400">Required</span>
                      )}
                      <span className="block text-[10.5px] text-muted-foreground truncate" title={activity.description}>
                        {activity.type} · {activity.description}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <button type="button" onClick={() => selectStop(stop.id)} className="text-left hover:underline">
                        <span className="font-medium text-main">{stop.customer.name}</span>
                        <span className="block text-[10.5px] text-muted-foreground">{stop.customer.code}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{stop.repId ? repName.get(stop.repId) ?? '—' : '—'}</td>
                    <td className="py-2.5 px-2 tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-muted-foreground" /> {stop.plannedStart} · {activity.estimatedMinutes} min
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <button
                        type="button"
                        disabled={live || activity.status === 'Skipped'}
                        onClick={() => toggleActivityStatus(stop.id, activity.id)}
                        className={`inline-flex px-2 py-[3px] rounded-full border text-[10px] font-semibold ${STATUS_TONE[activity.status]} disabled:cursor-default`}
                        title={live ? undefined : 'Change status'}
                      >
                        {activity.status}
                        {activity.completedAt ? ` · ${activity.completedAt}` : ''}
                      </button>
                    </td>
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
