import { customers, repsById } from '@/features/planning/data/demo-data';
import type { Customer } from '@/features/planning/types';

/**
 * Deterministic field history for the prototype's representatives.
 *
 * The board's figures are "counted from route stops". There is no backend to count, so
 * each planning rep gets a reproducible day-by-day visit plan (Monday–Saturday, four to
 * seven calls, a per-rep completion habit) derived from a hash of rep id and date. The
 * same rep and window always produce the same numbers, today's figures move as the day
 * goes on, and a rep created in the prototype has no history — "Nothing scheduled".
 */

export interface VisitOutcome {
  visitId: string;
  customer: Customer;
  /** Planned start, local time. */
  start: Date;
  minutes: number;
  state: 'completed' | 'missed' | 'inProgress' | 'open';
  flagged: boolean;
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable pseudo-random number in [0, 1) for the given key parts. */
function seeded(...parts: (string | number)[]): number {
  let t = (hash(parts.join('|')) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `yyyy-MM-dd` as local midnight. */
export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const customersByProvince = new Map<string, Customer[]>();
function customersFor(province: string): Customer[] {
  if (!customersByProvince.has(province)) {
    const local = customers.filter((c) => c.province === province);
    customersByProvince.set(province, local.length ? local : customers);
  }
  return customersByProvince.get(province)!;
}

export interface RepTimeline {
  /** Only reps from the planning roster have a field history. */
  repId: string;
  /** First working day (account creation). */
  since: Date;
  /** Last working day — set when the account is suspended. */
  until: Date | null;
}

/** One rep's calls on one day, with their outcome as of `now`. */
export function visitsOn(timeline: RepTimeline, day: Date, now: Date = new Date()): VisitOutcome[] {
  const rep = repsById[timeline.repId];
  if (!rep) return [];
  const key = dayKey(day);
  if (day.getDay() === 0) return [];
  if (key < dayKey(timeline.since) || key > dayKey(now)) return [];
  if (timeline.until && key > dayKey(timeline.until)) return [];

  const count = 4 + Math.floor(seeded(rep.id, key, 'n') * 4);
  const habit = 0.72 + seeded(rep.id, 'habit') * 0.25;
  const pool = customersFor(rep.province);

  return Array.from({ length: count }, (_, k) => {
    const start = new Date(day);
    start.setHours(8, 0, 0, 0);
    start.setMinutes(k * 75 + Math.floor(seeded(rep.id, key, k, 't') * 20));
    const minutes = 25 + Math.floor(seeded(rep.id, key, k, 'm') * 35);
    const end = new Date(start.getTime() + minutes * 60_000);
    const succeeded = seeded(rep.id, key, k, 'o') < habit;

    let state: VisitOutcome['state'];
    if (end <= now) state = succeeded ? 'completed' : 'missed';
    else if (start <= now) state = 'inProgress';
    else state = 'open';

    return {
      visitId: `VIS-${rep.id.replace('REP-', '')}-${key.replace(/-/g, '')}-${k + 1}`,
      customer: pool[Math.floor(seeded(rep.id, key, k, 'c') * pool.length)],
      start,
      minutes,
      state,
      flagged: state === 'completed' && seeded(rep.id, key, k, 'f') < 0.025,
    };
  });
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to && days.length < 800) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function hasFieldHistory(repId: string): boolean {
  return Boolean(repsById[repId]);
}

export function planningRep(repId: string) {
  return repsById[repId] ?? null;
}
