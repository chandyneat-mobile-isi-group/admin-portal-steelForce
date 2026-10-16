'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SummaryCard } from '@/components/shared/summary-card';
import { SearchBar } from '@/components/forms/search-bar';
import { Card } from '@/components/ui/card';
import { CalendarClock, Clock, DollarSign, Navigation, Route, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  RepAvatar,
  RouteTimeline,
  Segmented,
  depots,
  depotsById,
  formatDuration,
  formatKm,
  formatTime,
  repColor,
  usePlanning,
  type RepWeeklySchedule,
} from '@/features/planning';

type View = 'daily' | 'weekly';

const VIEWS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

const DAY_TONE: Record<RepWeeklySchedule['days'][number]['status'], string> = {
  Completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  Scheduled: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  Rest: 'bg-muted/50 text-muted-foreground border-surface',
};

/** Daily and weekly schedules — who is out, on which days, doing how much. */
export default function SchedulesPage() {
  const [view, setView] = useState<View>('daily');
  const [query, setQuery] = useState('');

  return (
    <PageBody>
      <PageToolbar>
        <ToolbarRow>
          <Segmented value={view} options={VIEWS} onChange={setView} />
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search sales rep…"
            className="w-full sm:w-[280px]"
          />
        </ToolbarRow>
      </PageToolbar>

      {view === 'daily' ? <DailySchedule query={query} /> : <WeeklySchedule query={query} />}
    </PageBody>
  );
}

function matchesName(name: string, query: string) {
  const q = query.trim().toLowerCase();
  return !q || name.toLowerCase().includes(q);
}

function DailySchedule({ query }: { query: string }) {
  const { reps, routeFor, selectStop, filters } = usePlanning();

  const rows = useMemo(
    () =>
      reps
        .filter((rep) => matchesName(`${rep.name} ${rep.employeeId}`, query))
        .map((rep) => ({ rep, route: routeFor(rep.id) }))
        .filter((row) => row.route.stops.length > 0)
        .sort((a, b) => b.route.stops.length - a.route.stops.length),
    [reps, routeFor, query]
  );

  const totals = useMemo(
    () => ({
      stops: rows.reduce((sum, r) => sum + r.route.stops.length, 0),
      minutes: rows.reduce((sum, r) => sum + r.route.totalMinutes, 0),
      km: rows.reduce((sum, r) => sum + r.route.distanceKm, 0),
    }),
    [rows]
  );

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard index={0} label="Reps scheduled" value={rows.length} icon={Users} color="#004A98" hint={`On ${filters.visitDate}`} />
        <SummaryCard index={1} label="Planned stops" value={totals.stops} icon={Route} color="#2C9942" />
        <SummaryCard index={2} label="Planned hours" value={Math.round(totals.minutes / 60)} suffix=" h" icon={Clock} color="#D47C17" hint="Drive + time on site" />
        <SummaryCard index={3} label="Planned distance" value={Math.round(totals.km)} suffix=" km" icon={Navigation} color="#5E53AE" />
      </div>

      <SectionHeader
        title="Daily schedule"
        subtitle="Each rep's day in visit order, leaving the depot at 08:00"
        icon={CalendarClock}
        count={rows.length}
      />

      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing scheduled" hint="Assign stops on Visit Plans to build a day." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map(({ rep, route }) => {
            const depot = depotsById[route.stops[0].depotId] ?? depots[0];
            return (
              <Card key={rep.id} className="p-5 rounded-card border-surface card-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <RepAvatar rep={rep} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-main truncate">{rep.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {rep.team} · {rep.shift}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground tabular-nums">
                    <p className="font-semibold text-main">
                      {route.stops.length} stops · {formatKm(route.distanceKm)}
                    </p>
                    <p>
                      {formatDuration(route.totalMinutes)} · ends {formatTime(route.finishTime)}
                    </p>
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <RouteTimeline
                    stops={route.stops}
                    depot={depot}
                    accent={repColor(rep.avatarHue)}
                    onSelect={(stop) => selectStop(stop.id)}
                    compact
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function WeeklySchedule({ query }: { query: string }) {
  const { weeklySchedules } = usePlanning();
  const { formatCurrency: formatMoney } = useI18n();

  const rows = useMemo(
    () => weeklySchedules.filter((s) => matchesName(s.repName, query)),
    [weeklySchedules, query]
  );

  const totals = useMemo(
    () => ({
      stops: rows.reduce((sum, r) => sum + r.totalStops, 0),
      hours: rows.reduce((sum, r) => sum + r.totalHours, 0),
      target: rows.reduce((sum, r) => sum + r.totalTargetValue, 0),
    }),
    [rows]
  );

  const days = rows[0]?.days ?? weeklySchedules[0]?.days ?? [];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard index={0} label="Reps this week" value={rows.length} icon={Users} color="#004A98" hint={weeklySchedules[0]?.weekRange} />
        <SummaryCard index={1} label="Planned stops" value={totals.stops} icon={Route} color="#2C9942" />
        <SummaryCard index={2} label="Planned hours" value={Math.round(totals.hours)} suffix=" h" icon={Clock} color="#D47C17" />
        <SummaryCard index={3} label="Target value" value={totals.target} prefix="$" icon={DollarSign} color="#5E53AE" />
      </div>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader
          title="Weekly schedule"
          subtitle={weeklySchedules[0]?.weekRange ?? 'This week'}
          icon={CalendarClock}
          count={rows.length}
        />
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No sales rep matches" hint="Clear the search to see the whole team." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12px]">
              <thead>
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold pb-2.5 pr-3">Sales rep</th>
                  {days.map((d) => (
                    <th key={d.day} className="text-center font-semibold pb-2.5 px-1">
                      {d.day}
                      <span className="block text-[9.5px] font-medium normal-case tracking-normal">{d.date.slice(5)}</span>
                    </th>
                  ))}
                  <th className="text-right font-semibold pb-2.5 pl-3">Week</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.repId} className="border-b border-surface last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-main whitespace-nowrap">{row.repName}</td>
                    {row.days.map((d) => (
                      <td key={d.day} className="py-2 px-1">
                        <div
                          className={`rounded-lg border px-2 py-1.5 text-center ${DAY_TONE[d.status]}`}
                          title={`${d.status} · ${d.stopCount} stops · ${d.hours} h · ${formatMoney(d.targetValue)}`}
                        >
                          {d.status === 'Rest' ? (
                            <span className="text-[10.5px] font-medium">Rest</span>
                          ) : (
                            <>
                              <span className="block text-[12px] font-bold tabular-nums">{d.stopCount}</span>
                              <span className="block text-[9.5px] tabular-nums">{d.hours} h</span>
                            </>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-bold text-main">{row.totalStops} stops</span>
                      <span className="block text-[10.5px] text-muted-foreground">
                        {row.totalHours} h · {formatMoney(row.totalTargetValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-[10.5px] text-muted-foreground">
          {(Object.keys(DAY_TONE) as Array<keyof typeof DAY_TONE>).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded border ${DAY_TONE[status]}`} /> {status}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}
