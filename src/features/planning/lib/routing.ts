/**
 * Route timing and ordering, run in the browser.
 *
 * The prototype has no route planner behind it, so the board times and reorders routes
 * here: leave the depot at 08:00, drive, serve, repeat. Shared by the planning store and
 * the mock planning service so both always agree on a route's shape.
 */
import { customersById, depots, depotsById } from '../data/demo-data';
import { hhmmToMinutes, minutesToHHMM, roadKm, travelMinutes } from './geo';
import type { OptimizeStrategy, Stop } from '../types';

export const DAY_START = '08:00';

const TIER_WEIGHT: Record<string, number> = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 };
const PRIORITY_WEIGHT: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** Re-times a route in its current order and renumbers it from 1. */
export function retime(repId: string, ordered: Stop[]): Stop[] {
  if (ordered.length === 0) return ordered;
  const depot = depotsById[ordered[0].depotId] ?? depots[0];
  let clock = hhmmToMinutes(DAY_START);
  let from = { lat: depot.lat, lng: depot.lng };

  return ordered.map((stop, index) => {
    const customer = customersById[stop.customerId];
    if (!customer) return { ...stop, repId, seq: index + 1 };
    const legKm = roadKm(from, customer);
    clock += travelMinutes(legKm);
    const plannedStart = minutesToHHMM(clock);
    clock += stop.estimatedMinutes;
    from = { lat: customer.lat, lng: customer.lng };
    return {
      ...stop,
      repId,
      seq: index + 1,
      plannedStart,
      distanceKm: Number(legKm.toFixed(1)),
    };
  });
}

/** Orders one route by the chosen strategy. Distance is a nearest-neighbour walk. */
export function sortByStrategy(list: Stop[], strategy: OptimizeStrategy, depotId: string): Stop[] {
  const depot = depotsById[depotId] ?? depots[0];
  const copy = [...list];

  switch (strategy) {
    case 'Priority':
      return copy.sort(
        (a, b) =>
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          a.distanceKm - b.distanceKm
      );
    case 'Customer Level':
      return copy.sort(
        (a, b) =>
          TIER_WEIGHT[customersById[a.customerId]?.tier] -
            TIER_WEIGHT[customersById[b.customerId]?.tier] ||
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
      );
    case 'Planned Time':
      return copy.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
    case 'Sales Territory':
      return copy.sort((a, b) => {
        const ca = customersById[a.customerId];
        const cb = customersById[b.customerId];
        return (
          (ca?.province ?? '').localeCompare(cb?.province ?? '') ||
          (ca?.district ?? '').localeCompare(cb?.district ?? '') ||
          a.distanceKm - b.distanceKm
        );
      });
    case 'Distance':
    default: {
      const remaining = [...copy];
      const ordered: Stop[] = [];
      let cursor = { lat: depot.lat, lng: depot.lng };
      while (remaining.length) {
        let bestIdx = 0;
        let bestKm = Infinity;
        remaining.forEach((s, i) => {
          const customer = customersById[s.customerId];
          const km = customer ? roadKm(cursor, customer) : Infinity;
          if (km < bestKm) {
            bestKm = km;
            bestIdx = i;
          }
        });
        const [next] = remaining.splice(bestIdx, 1);
        ordered.push(next);
        cursor = customersById[next.customerId] ?? cursor;
      }
      return ordered;
    }
  }
}

/**
 * Replaces one rep's route inside the full stop list, re-timed, keeping the list in id
 * order so cards do not jump around between renders.
 */
export function withRoute(all: Stop[], repId: string, route: Stop[]): Stop[] {
  const rest = all.filter((s) => s.repId !== repId);
  return [...rest, ...retime(repId, route)].sort((a, b) => a.id.localeCompare(b.id));
}

/** Moves one stop to `targetIndex` within its rep's route. */
export function moveWithinRoute(all: Stop[], repId: string, stopId: string, targetIndex: number): Stop[] {
  const route = all.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq);
  const from = route.findIndex((s) => s.id === stopId);
  if (from === -1) return all;
  const [moved] = route.splice(from, 1);
  route.splice(Math.max(0, Math.min(targetIndex, route.length)), 0, moved);
  return withRoute(all, repId, route);
}

/** Reorders every route named in `repIds` by `strategy`. Returns the new list and stops touched. */
export function optimizeRoutes(
  all: Stop[],
  repIds: string[],
  strategy: OptimizeStrategy
): { stops: Stop[]; touched: number; moved: number } {
  let next = [...all];
  let touched = 0;
  let moved = 0;
  repIds.forEach((rid) => {
    const route = next.filter((s) => s.repId === rid).sort((a, b) => a.seq - b.seq);
    if (route.length === 0) return;
    touched += route.length;
    const sorted = sortByStrategy(route, strategy, route[0].depotId);
    moved += sorted.filter((s, i) => s.id !== route[i].id).length;
    next = withRoute(next, rid, sorted);
  });
  return { stops: next, touched, moved };
}
