/**
 * What the planning calendar shows, and the date arithmetic its three views share.
 *
 * Dates are handled as local `YYYY-MM-DD` strings — the same spelling the stops and
 * call plans carry — so a day never shifts across a timezone boundary.
 */

import type { CallPlanItem, Priority, SalesRep, StopStatus, StopView } from '../types';

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEntry {
  id: string;
  date: string;
  time: string;
  kind: 'visit' | 'call';
  title: string;
  subtitle: string;
  repId: string | null;
  repName: string;
  team: string;
  province: string;
  priority: Priority;
  stopId?: string;
  stopStatus?: StopStatus;
  call?: CallPlanItem;
}

/** One rep's entries on one day, in time order. */
export interface RepDay {
  repId: string;
  repName: string;
  color: string;
  entries: CalendarEntry[];
}

export function buildEntries(
  stopViews: StopView[],
  callPlans: CallPlanItem[],
  reps: SalesRep[],
  fallbackDate: string
): CalendarEntry[] {
  const repById = new Map(reps.map((r) => [r.id, r]));

  const visits: CalendarEntry[] = stopViews
    .filter((s) => s.repId)
    // A committed call plan is already on the calendar as its plan; skip the stop it became.
    .filter((s) => !s.notes?.startsWith('Imported from Call Plan'))
    .map((s) => {
      const rep = s.repId ? repById.get(s.repId) : undefined;
      return {
        id: s.id,
        date: s.scheduledDate ?? fallbackDate,
        time: s.plannedStart,
        kind: 'visit' as const,
        title: s.customer.name,
        subtitle: s.visitReason,
        repId: s.repId,
        repName: rep?.name ?? 'Unassigned',
        team: rep?.team ?? '',
        province: s.customer.province,
        priority: s.priority,
        stopId: s.id,
        stopStatus: s.status,
      };
    });

  const calls: CalendarEntry[] = callPlans.map((p) => {
    const rep = repById.get(p.repId);
    return {
      id: p.id,
      date: p.plannedDate,
      time: p.timeSlot.split(' - ')[0] ?? '',
      kind: 'call' as const,
      title: p.customerName,
      subtitle: p.objective,
      repId: p.repId,
      repName: rep?.name ?? p.repName,
      team: rep?.team ?? '',
      province: p.province,
      priority: p.priority,
      call: p,
    };
  });

  return [...visits, ...calls];
}

/** Groups a day's entries by rep, busiest-first then by name, entries by time. */
export function groupByRep(entries: CalendarEntry[], colorOf: (repId: string | null) => string): RepDay[] {
  const map = new Map<string, RepDay>();
  entries.forEach((e) => {
    const key = e.repId ?? 'none';
    const day = map.get(key) ?? { repId: key, repName: e.repName, color: colorOf(e.repId), entries: [] };
    day.entries.push(e);
    map.set(key, day);
  });
  const days = Array.from(map.values());
  days.forEach((d) => d.entries.sort((a, b) => a.time.localeCompare(b.time)));
  return days.sort((a, b) => a.repName.localeCompare(b.repName));
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseIso(iso);
  return isoDate(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const d = parseIso(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/** The six-week, Monday-first grid that contains the month of `iso`. */
export function monthGrid(iso: string): string[] {
  const d = parseIso(iso);
  const first = isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatDay(iso: string, options: Intl.DateTimeFormatOptions): string {
  return parseIso(iso).toLocaleDateString('en-GB', options);
}

/** Toolbar caption for the current range. */
export function rangeLabel(view: CalendarView, anchor: string): string {
  if (view === 'day') return formatDay(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (view === 'month') return formatDay(anchor, { month: 'long', year: 'numeric' });
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  return `${formatDay(start, { day: 'numeric', month: 'short' })} – ${formatDay(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
