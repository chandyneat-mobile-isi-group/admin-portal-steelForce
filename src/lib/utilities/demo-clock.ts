/**
 * The demo data is anchored to a fixed date so "today" is stable across a
 * server render and client hydration. Delete this module when live data
 * replaces the generators.
 */

/** The date the demo data is anchored to, so "today" is stable. */
export const TODAY = new Date(Date.UTC(2026, 7, 7));

export function isoDate(offsetDays: number, from: Date = TODAY): string {
  return new Date(from.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);
}
