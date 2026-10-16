'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { FilterChip } from '@/components/forms/filter-chip';
import { SearchBar } from '@/components/forms/search-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  Layers,
  MapPin,
  RotateCcw,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PRIORITIES, PROVINCES, PriorityBadge, Segmented, TEAMS, usePlanning } from '@/features/planning';
import {
  addDays,
  addMonths,
  buildEntries,
  isoDate,
  monthGrid,
  rangeLabel,
  startOfWeek,
  type CalendarEntry,
  type CalendarView,
} from '@/features/planning';
import { DayView, MonthView, WeekView } from './calendar-views';

const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const TYPE_OPTIONS = [
  { value: 'visit', label: 'Visits' },
  { value: 'call', label: 'Call plans' },
];

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

const VIEW_KEY = 'planning.calendar.view';

/** Softer than the map's route colour — a calendar is looked at for a long time. */
function softColor(hue: number) {
  return `hsl(${hue}, 45%, 58%)`;
}

interface Filters {
  search: string;
  repId: string;
  team: string;
  province: string;
  type: string;
  priority: string;
}

const NO_FILTERS: Filters = { search: '', repId: 'All', team: 'All', province: 'All', type: 'All', priority: 'All' };

/** Who is visiting whom, and when — by day, week or month. */
export default function PlanningCalendarPage() {
  const { stopViews, callPlans, reps, filters: planFilters, selectStop } = usePlanning();
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [openCall, setOpenCall] = useState<CalendarEntry | null>(null);
  const today = isoDate(new Date());

  // Remember the last view per browser. Storage can be unavailable; the default is fine then.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === 'day' || saved === 'week' || saved === 'month') setView(saved);
    } catch {}
  }, []);
  const changeView = (next: CalendarView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {}
  };

  const entries = useMemo(
    () => buildEntries(stopViews, callPlans, reps, planFilters.visitDate),
    [stopViews, callPlans, reps, planFilters.visitDate]
  );

  const hueByRep = useMemo(() => new Map(reps.map((r) => [r.id, r.avatarHue])), [reps]);
  const colorOf = useCallback(
    (repId: string | null) => (repId && hueByRep.has(repId) ? softColor(hueByRep.get(repId)!) : 'hsl(215, 15%, 65%)'),
    [hueByRep]
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filters.repId !== 'All' && e.repId !== filters.repId) return false;
      if (filters.team !== 'All' && e.team !== filters.team) return false;
      if (filters.province !== 'All' && e.province !== filters.province) return false;
      if (filters.type !== 'All' && e.kind !== filters.type) return false;
      if (filters.priority !== 'All' && e.priority !== filters.priority) return false;
      if (q && !`${e.title} ${e.subtitle} ${e.repName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filters]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    filtered.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [filtered]);

  // Until the user moves, open on the busiest day so the calendar is never blank on arrival.
  const busiest = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => counts.set(e.date, (counts.get(e.date) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? today;
  }, [entries, today]);
  const current = anchor ?? busiest;

  const step = (direction: 1 | -1) => {
    if (view === 'day') setAnchor(addDays(current, direction));
    else if (view === 'week') setAnchor(addDays(current, 7 * direction));
    else setAnchor(addMonths(current, direction));
  };

  const pickDay = (iso: string) => {
    setAnchor(iso);
    changeView('day');
  };

  const open = (entry: CalendarEntry) => {
    if (entry.stopId) selectStop(entry.stopId);
    else setOpenCall(entry);
  };

  // Counts for whatever range is on screen.
  const rangeDays = useMemo(() => {
    if (view === 'day') return [current];
    if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(current), i));
    const month = current.slice(0, 7);
    return monthGrid(current).filter((d) => d.startsWith(month));
  }, [view, current]);
  const inRange = rangeDays.flatMap((d) => byDate.get(d) ?? []);
  const summary = {
    visits: inRange.filter((e) => e.kind === 'visit').length,
    calls: inRange.filter((e) => e.kind === 'call').length,
    reps: new Set(inRange.map((e) => e.repId)).size,
  };

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const activeFilters = (Object.keys(NO_FILTERS) as Array<keyof Filters>).filter(
    (k) => filters[k].trim() !== NO_FILTERS[k]
  ).length;

  const viewProps = { anchor: current, today, byDate, colorOf, onOpen: open };

  return (
    <PageBody>
      <PageToolbar>
        <div className="space-y-3">
          <ToolbarRow>
            <Segmented value={view} options={VIEWS} onChange={changeView} />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(-1)} aria-label="Previous">
                <ChevronLeft size={17} />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(1)} aria-label="Next">
                <ChevronRight size={17} />
              </Button>
            </div>
            <h2 className="text-[15px] font-semibold text-main">{rangeLabel(view, current)}</h2>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setAnchor(today)}>
              Today
            </Button>
          </ToolbarRow>

          <ToolbarRow>
            <SearchBar
              value={filters.search}
              onChange={(v) => setFilter('search', v)}
              placeholder="Search customer or objective…"
              className="w-full sm:w-[260px]"
            />
            <FilterChip
              label="Sales rep"
              icon={User}
              value={filters.repId}
              options={reps.map((r) => ({ value: r.id, label: r.name }))}
              onChange={(v) => setFilter('repId', v)}
              allLabel="All reps"
              searchable
            />
            <FilterChip label="Team" icon={Users} value={filters.team} options={opts(TEAMS)} onChange={(v) => setFilter('team', v)} allLabel="All teams" />
            <FilterChip label="Province" icon={MapPin} value={filters.province} options={opts(PROVINCES)} onChange={(v) => setFilter('province', v)} allLabel="All provinces" />
            <FilterChip label="Type" icon={Layers} value={filters.type} options={TYPE_OPTIONS} onChange={(v) => setFilter('type', v)} allLabel="Visits & call plans" />
            <FilterChip label="Priority" icon={Flag} value={filters.priority} options={opts(PRIORITIES)} onChange={(v) => setFilter('priority', v)} allLabel="Any priority" />
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
                <RotateCcw size={13} className="mr-1.5" /> Clear {activeFilters}
              </Button>
            )}
          </ToolbarRow>
        </div>
      </PageToolbar>

      <Card className="p-4 sm:p-5 rounded-card border-surface card-shadow">
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck2 size={14} /> <b className="font-semibold text-main tabular-nums">{summary.visits}</b> visits
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList size={14} /> <b className="font-semibold text-main tabular-nums">{summary.calls}</b> call plans
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} /> <b className="font-semibold text-main tabular-nums">{summary.reps}</b> reps
          </span>
          <span className="ml-auto hidden sm:inline text-[11px]">
            {view === 'month' ? 'Click a day to open it' : 'Click an entry for details · done visits are struck through'}
          </span>
        </div>

        {view === 'day' && <DayView {...viewProps} />}
        {view === 'week' && <WeekView {...viewProps} onPickDay={pickDay} />}
        {view === 'month' && <MonthView {...viewProps} onPickDay={pickDay} />}
      </Card>

      <Dialog open={!!openCall} onOpenChange={(o) => !o && setOpenCall(null)}>
        <DialogContent className="sm:max-w-[440px]">
          {openCall?.call && (
            <>
              <DialogHeader>
                <DialogTitle>{openCall.title}</DialogTitle>
                <DialogDescription>
                  {openCall.call.callPlanNo} · {openCall.call.customerCode} · {openCall.province}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[12.5px]">
                <dt className="text-muted-foreground">Sales rep</dt>
                <dd className="text-main">{openCall.repName}</dd>
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-main tabular-nums">{openCall.date} · {openCall.call.timeSlot}</dd>
                <dt className="text-muted-foreground">Priority</dt>
                <dd><PriorityBadge priority={openCall.priority} /></dd>
                <dt className="text-muted-foreground">Objective</dt>
                <dd className="text-main">{openCall.subtitle}</dd>
                <dt className="text-muted-foreground">Activities</dt>
                <dd className="text-main">{openCall.call.activities.join(', ') || '—'}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-main">{openCall.call.status}</dd>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
