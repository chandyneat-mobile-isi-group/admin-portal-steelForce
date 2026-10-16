/**
 * Reconciles the backend's planning contracts with the shapes this module's cards,
 * charts and maps were written against.
 *
 * ## What this file is really for
 *
 * The planning UI was built against `data/demo-data.ts`, whose `Customer` and `Stop`
 * carry fields the platform does not store: a customer tier, a stop priority, an
 * expected order value, a sales organisation and a division. The backend contracts say
 * so in as many words — `AdminRoutePlanStopResponse` documents that there is no
 * `priority` field because "`RouteStop` does not model stop priority and inventing a
 * value here would put a number on screen that nothing in the system decides".
 *
 * That rule does not stop applying because the value is being invented in a browser.
 * So this file is split in two, and the split is the point:
 *
 * - **Derivations** compute a display value from data the platform really stores, by a
 *   rule written down here. `priority` from days since the last visit is a derivation:
 *   change the thresholds and the meaning changes, but nothing is fabricated.
 * - **Placeholders** are for fields with no stored basis at all. They are constants,
 *   they are neutral, and they are listed in {@link UNMODELLED_FIELDS} so a reader can
 *   see at a glance what the board is not telling them. `orderValue` is 0 — not a
 *   plausible-looking figure — because a planner reading "$48k expected" off a number
 *   nobody computed is worse served than one reading zero and asking why.
 *
 * If a field in this list later gains a real backend source, delete its placeholder
 * and map it. Nothing else in the module should need to change.
 */
import type {
  Customer,
  CreditStatus,
  Priority,
  SalesRep,
  Stop,
  StopStatus,
  StopView,
} from './types';
import type { PlanningCustomerDto, PlanningRepDto, PlanningStopDto } from './api';
import { depots } from './data/demo-data';

/**
 * Fields the UI renders that the platform does not store.
 *
 * Exported so a screen can surface the gap honestly — an "expected order value" tile
 * reading $0 is only defensible if something nearby says the platform does not track it.
 */
export const UNMODELLED_FIELDS = [
  'stop.orderValue',
  'stop.photos',
  'stop.visitReason',
  'stop.notes',
  'customer.salesOrg',
  'customer.division',
  'customer.workingHours',
  'rep.rating',
] as const;

/** The label used wherever the platform stores nothing for a dimension. */
export const UNKNOWN = 'Unknown';

/**
 * Where the priority bands fall, in days since the customer was last visited.
 *
 * **A portal-side presentation rule, not a stored field.** It exists so the board can
 * sort and colour by urgency using something real — the visit history — rather than by
 * a number nobody set. Change these and every priority on every screen changes with
 * them, which is the correct blast radius for a rule of this kind.
 */
export const PRIORITY_THRESHOLD_DAYS = {
  critical: 60,
  high: 30,
  medium: 14,
} as const;

/**
 * Where the tier bands fall, in lifetime order value.
 *
 * The same caveat as {@link PRIORITY_THRESHOLD_DAYS}: the platform stores the lifetime
 * value, not the tier, and these thresholds are this portal's reading of it. They are
 * in the customer's own currency, which the board does not convert — a deployment
 * trading in more than one currency needs a real tier field rather than better
 * thresholds here.
 */
export const TIER_THRESHOLDS = {
  platinum: 250_000,
  gold: 75_000,
  silver: 15_000,
} as const;

/** Where the credit bands fall, as a fraction of the approved limit. */
export const CREDIT_THRESHOLDS = {
  onHold: 1,
  watchlist: 0.8,
} as const;

/**
 * Maps a stop's execution state onto the board's five-state vocabulary.
 *
 * **Every backend stop belongs to a route, so none of them can be `Unassigned`.** That
 * state exists for the board's left-hand pool, which is customers rather than stops;
 * see {@link candidateToStop}. A `pending` stop is one that is assigned and not yet
 * started, which is exactly what the board calls `Assigned`.
 *
 * `missed` becomes `Skipped` rather than a state of its own: the demo vocabulary has no
 * "missed", and the two mean the same thing to a planner looking at yesterday.
 */
export function toStopStatus(wire: string): StopStatus {
  switch (wire) {
    case 'checkedOut':
      return 'Completed';
    case 'checkedIn':
    case 'arrived':
    case 'enRoute':
      return 'In Progress';
    case 'missed':
      return 'Skipped';
    default:
      return 'Assigned';
  }
}

/** Whole days between an ISO timestamp and now, or null when there is no timestamp. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

/**
 * Derives a stop's urgency from how long the customer has gone unvisited.
 *
 * A customer nobody has ever called on is `Critical`, not `Low`: never-visited is the
 * most overdue there is, and sorting it to the bottom would bury exactly the accounts a
 * planner opens the board to find.
 */
export function derivePriority(lastVisitIso: string | null | undefined, now = Date.now()): Priority {
  const days = daysSince(lastVisitIso, now);
  if (days === null) return 'Critical';
  if (days >= PRIORITY_THRESHOLD_DAYS.critical) return 'Critical';
  if (days >= PRIORITY_THRESHOLD_DAYS.high) return 'High';
  if (days >= PRIORITY_THRESHOLD_DAYS.medium) return 'Medium';
  return 'Low';
}

/** Derives a customer tier from their stored lifetime order value. */
export function deriveTier(lifetimeValue: number): Customer['tier'] {
  if (lifetimeValue >= TIER_THRESHOLDS.platinum) return 'Platinum';
  if (lifetimeValue >= TIER_THRESHOLDS.gold) return 'Gold';
  if (lifetimeValue >= TIER_THRESHOLDS.silver) return 'Silver';
  return 'Bronze';
}

/**
 * Derives a credit standing from the stored balance against the stored limit.
 *
 * A customer with no limit set is `Good Standing` rather than `On Hold`: an unset limit
 * is a gap in the credit record, not a decision to stop trading with them, and treating
 * it as a block would flag every customer SAP has not sent terms for.
 */
export function deriveCreditStatus(balance: number, limit: number): CreditStatus {
  if (limit <= 0) return 'Good Standing';
  const used = balance / limit;
  if (used >= CREDIT_THRESHOLDS.onHold) return 'On Hold';
  if (used >= CREDIT_THRESHOLDS.watchlist) return 'Watchlist';
  return 'Good Standing';
}

/**
 * A stable hue per identifier, so a representative keeps their colour across reloads.
 *
 * The demo data stored `avatarHue` on the rep; the backend has no such field and should
 * not — an avatar colour is a rendering concern. Hashing the id gives the same
 * behaviour with nothing persisted.
 */
export function hueFor(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

/** Projects a backend customer onto the card shape the module renders. */
export function toCustomer(dto: PlanningCustomerDto, now = Date.now()): Customer {
  const lastVisit = dto.lastVisitDate ?? null;

  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    // The platform's four customer types are not the demo's eight. Passed through
    // verbatim rather than squeezed into the old vocabulary: a filter offering a
    // category the data can never match is worse than one offering the real ones.
    type: dto.type as Customer['type'],
    salesOrg: UNKNOWN as Customer['salesOrg'],
    division: UNKNOWN as Customer['division'],
    province: (dto.province ?? UNKNOWN) as Customer['province'],
    district: dto.district ?? UNKNOWN,
    address: dto.address ?? '',
    contactPerson: dto.contactPerson ?? '',
    phone: dto.phone ?? '',
    workingHours: UNKNOWN,
    creditStatus: deriveCreditStatus(dto.creditBalance, dto.creditLimit),
    creditLimit: dto.creditLimit,
    outstanding: dto.creditBalance,
    outstandingOrders: 0,
    lastVisit,
    totalVisits: dto.totalOrders,
    lifetimeValue: dto.lifetimeValue,
    tier: deriveTier(dto.lifetimeValue),
    notes: '',
    // An unpinned customer would otherwise land at (0, 0) — the Gulf of Guinea — and
    // drag every map bound with it. NaN keeps them off the map without dropping them
    // from the list, and `Number.isFinite` is the check every consumer already makes.
    lat: dto.location?.latitude ?? Number.NaN,
    lng: dto.location?.longitude ?? Number.NaN,
  };
}

/**
 * Projects a backend stop onto the board's `StopView`.
 *
 * @param depotId Which depot the route runs from. The backend does not put a depot on a
 *   stop — depots belong to the representative, not the call — so the caller passes the
 *   one it resolved for the rep.
 */
export function toStopView(dto: PlanningStopDto, depotId: string, now = Date.now()): StopView {
  const customer = dto.customer
    ? toCustomer(dto.customer, now)
    : unknownCustomer(dto.id);

  const stop: Stop = {
    id: dto.id,
    seq: dto.sequence,
    customerId: customer.id,
    depotId,
    repId: dto.repId,
    priority: derivePriority(dto.customer?.lastVisitDate, now),
    status: toStopStatus(dto.status),
    // The board's timeline works in local wall-clock "HH:mm"; the wire carries an
    // instant. Converted once here so no card has to know about time zones.
    plannedStart: toLocalHhMm(dto.plannedArrival),
    estimatedMinutes: dto.estimatedMinutes,
    distanceKm: dto.distanceFromPreviousKm ?? 0,
    visitReason: 'Scheduled call',
    notes: '',
    orderValue: 0,
    photos: 0,
  };

  return { ...stop, customer };
}

/**
 * Turns a pooled customer into the unassigned stop the board draws in its left column.
 *
 * **Synthetic, and it does not exist on the server.** The backend has no unassigned
 * stop — a stop is a row on somebody's route — so the pool is customers, and dragging
 * one calls `assignStop`, which is the moment a real stop is created. The id is
 * prefixed so nothing mistakes it for a stop id and tries to `DELETE` it.
 */
export function candidateToStop(
  dto: PlanningCustomerDto,
  depotId: string,
  now = Date.now()
): StopView {
  const customer = toCustomer(dto, now);

  return {
    id: `${CANDIDATE_PREFIX}${dto.id}`,
    seq: 0,
    customerId: dto.id,
    depotId,
    repId: null,
    priority: derivePriority(dto.lastVisitDate, now),
    status: 'Unassigned',
    plannedStart: '08:00',
    estimatedMinutes: 45,
    distanceKm: 0,
    visitReason: 'Scheduled call',
    notes: '',
    orderValue: 0,
    photos: 0,
    customer,
  };
}

/** Marks an id as a pooled customer rather than a stop that exists on a route. */
export const CANDIDATE_PREFIX = 'candidate:';

/** True when an id came from {@link candidateToStop} and has no server-side stop. */
export const isCandidateId = (id: string): boolean => id.startsWith(CANDIDATE_PREFIX);

/** Recovers the customer id from a synthetic candidate stop id. */
export const customerIdFromCandidate = (id: string): string => id.slice(CANDIDATE_PREFIX.length);

/** Projects a backend representative onto the module's `SalesRep`. */
export function toSalesRep(dto: PlanningRepDto): SalesRep {
  const seenAt = dto.lastSeenAt ? Date.parse(dto.lastSeenAt) : Number.NaN;

  // "Online" is a claim about right now, and the platform only knows when a fix last
  // arrived. Fifteen minutes is the window inside which a handset that is on and has
  // signal will have reported; beyond it the honest answer is that nobody knows.
  const online = Number.isFinite(seenAt) && Date.now() - seenAt < 15 * 60_000;

  return {
    id: dto.id,
    employeeId: dto.employeeCode ?? dto.id.slice(0, 8),
    name: dto.name,
    initials: initialsOf(dto.name),
    team: (dto.territory ?? UNKNOWN) as SalesRep['team'],
    salesOrg: UNKNOWN as SalesRep['salesOrg'],
    division: UNKNOWN as SalesRep['division'],
    province: (dto.territory ?? UNKNOWN) as SalesRep['province'],
    phone: dto.phoneNumber ?? '',
    status: deriveRepStatus(dto, online),
    online,
    capacity: dto.capacity,
    distanceCovered: dto.plannedDistanceKm ?? 0,
    currentLocation: dto.lastKnownLocation ? 'Last reported position' : UNKNOWN,
    shift: UNKNOWN,
    avatarHue: hueFor(dto.id),
    rating: 0,
    lat: dto.lastKnownLocation?.latitude ?? Number.NaN,
    lng: dto.lastKnownLocation?.longitude ?? Number.NaN,
  };
}

/**
 * Derives a representative's working state from their route and their last fix.
 *
 * A suspended account is `Offline` whatever their handset last said — an account that
 * cannot sign in is not working, and showing them as on-route would put a planner's
 * stops on somebody who will never receive them.
 */
function deriveRepStatus(dto: PlanningRepDto, online: boolean): SalesRep['status'] {
  if (!dto.isActive) return 'Offline';
  if (dto.routeStatus === 'inProgress') return 'On Route';
  if (online) return 'Working';
  return 'Offline';
}

/** Two initials from a display name, for the avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Renders an instant as local "HH:mm", which is what the timeline sorts and prints. */
export function toLocalHhMm(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '00:00';
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}

/**
 * Resolves which depot a representative's route is drawn from.
 *
 * Depots are a separate module with their own endpoint, and the planning board does not
 * load them — so this matches the rep's stored `depotCode` against the depot fixtures
 * the map already ships and falls back to the first one. **The fallback affects the
 * drawn route's first leg only**; every stop-to-stop distance on the board comes from
 * the server.
 */
export function depotIdFor(depotCode: string | null | undefined): string {
  const match = depotCode
    ? depots.find((depot) => depot.code.toLowerCase() === depotCode.toLowerCase())
    : undefined;
  return (match ?? depots[0]).id;
}

/** A stand-in for a stop whose customer record has been deleted. */
function unknownCustomer(stopId: string): Customer {
  return {
    id: `missing:${stopId}`,
    code: '—',
    name: 'Customer record removed',
    type: UNKNOWN as Customer['type'],
    salesOrg: UNKNOWN as Customer['salesOrg'],
    division: UNKNOWN as Customer['division'],
    province: UNKNOWN as Customer['province'],
    district: UNKNOWN,
    address: '',
    contactPerson: '',
    phone: '',
    workingHours: UNKNOWN,
    creditStatus: 'Good Standing',
    creditLimit: 0,
    outstanding: 0,
    outstandingOrders: 0,
    lastVisit: null,
    totalVisits: 0,
    lifetimeValue: 0,
    tier: 'Bronze',
    notes: '',
    lat: Number.NaN,
    lng: Number.NaN,
  };
}
