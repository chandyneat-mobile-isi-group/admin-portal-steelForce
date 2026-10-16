/**
 * The planning module's service boundary — a local mock for the static prototype.
 *
 * The contracts (schemas, DTO types, `planningApi`'s signatures) are the ones the
 * backend's `AdminPlanningController` defined, so `adapters.ts` and the hooks are
 * unchanged. The implementation reads and writes the persisted fixtures in
 * `data/mock-db.ts`; nothing here performs a network request.
 */
import { z } from 'zod';
import { daysSince } from './adapters';
import { customersById, depots, depotsById, salesReps } from './data/demo-data';
import { stopsStore } from './data/mock-db';
import { moveWithinRoute, optimizeRoutes, withRoute } from './lib/routing';
import { hhmmToMinutes, minutesToHHMM } from './lib/geo';
import type { Customer, OptimizeStrategy, SalesRep, Stop, StopStatus } from './types';
import { mockDelay, mockId, mockResolve, paginate, type QueryParams } from '@/services/mock';

// --- Schemas ---------------------------------------------------------------

export const PlanLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const GeoPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMetres: z.number(),
});

/**
 * Stop execution states, exactly as `RouteStop.Status` spells them.
 *
 * `catch` rather than a strict parse: a backend that adds a seventh state should make a
 * card render as pending, not blank the whole board.
 */
export const PlanningStopStatus = z
  .enum(['pending', 'enRoute', 'arrived', 'checkedIn', 'checkedOut', 'missed'])
  .catch('pending');

export const PlanningCustomerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  territory: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: PlanLocationSchema.nullable().optional(),
  creditLimit: z.number().default(0),
  creditBalance: z.number().default(0),
  currency: z.string().default('USD'),
  lifetimeValue: z.number().default(0),
  totalOrders: z.number().default(0),
  lastOrderDate: z.string().nullable().optional(),
  lastVisitDate: z.string().nullable().optional(),
  assignedSalesRepId: z.string().nullable().optional(),
});

export const PlanningStopSchema = z.object({
  id: z.string(),
  planId: z.string(),
  repId: z.string(),
  repName: z.string().nullable().optional(),
  sequence: z.number(),
  status: PlanningStopStatus,
  plannedArrival: z.string(),
  plannedDeparture: z.string(),
  actualArrival: z.string().nullable().optional(),
  actualDeparture: z.string().nullable().optional(),
  estimatedMinutes: z.number().default(0),
  distanceFromPreviousKm: z.number().nullable().optional(),
  canEdit: z.boolean().default(true),
  customer: PlanningCustomerSchema.nullable().optional(),
});

export const PlanningRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  territory: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  planId: z.string().nullable().optional(),
  routeStatus: z.string().nullable().optional(),
  assignedStops: z.number().default(0),
  completedStops: z.number().default(0),
  capacity: z.number().default(12),
  plannedDistanceKm: z.number().nullable().optional(),
  plannedMinutes: z.number().default(0),
  lastKnownLocation: GeoPointSchema.nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
});

export const PlanningKpiSchema = z.object({
  totalStops: z.number().default(0),
  completedStops: z.number().default(0),
  inProgressStops: z.number().default(0),
  pendingStops: z.number().default(0),
  missedStops: z.number().default(0),
  unscheduledCustomers: z.number().default(0),
  repsWithRoutes: z.number().default(0),
  totalReps: z.number().default(0),
  coveragePercent: z.number().nullable().optional(),
  completionPercent: z.number().nullable().optional(),
  totalDistanceKm: z.number().default(0),
  averageDistanceKm: z.number().nullable().optional(),
  plannedMinutes: z.number().default(0),
});

export const PlanningBoardSchema = z.object({
  date: z.string(),
  kpis: PlanningKpiSchema,
  reps: z.array(PlanningRepSchema).default([]),
  stops: z.array(PlanningStopSchema).default([]),
});

export const PlanningCandidateSchema = z.object({
  customer: PlanningCustomerSchema,
  daysSinceLastVisit: z.number().nullable().optional(),
  scheduledElsewhere: z.boolean().default(false),
});

export const PlanningCandidatePageSchema = z.object({
  items: z.array(PlanningCandidateSchema).default([]),
  totalCount: z.number().default(0),
});

export const AssignStopResultSchema = z.object({
  stopId: z.string(),
  planId: z.string(),
  sequence: z.number(),
  plannedArrival: z.string(),
  plannedDeparture: z.string(),
  createdPlan: z.boolean().default(false),
});

export const OptimizeResultSchema = z.object({
  planId: z.string(),
  strategy: z.string(),
  stopsMoved: z.number().default(0),
  distanceBeforeKm: z.number().nullable().optional(),
  distanceAfterKm: z.number().nullable().optional(),
  stops: z.array(z.unknown()).default([]),
});

export const PlanningTrendPointSchema = z.object({
  date: z.string(),
  scheduledStops: z.number().default(0),
  completedStops: z.number().default(0),
  missedStops: z.number().default(0),
  activeReps: z.number().default(0),
  distanceKm: z.number().default(0),
});

export const PlanningBreakdownSchema = z.object({
  key: z.string(),
  scheduledStops: z.number().default(0),
  completedStops: z.number().default(0),
});

export const PlanningAnalyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  totals: PlanningKpiSchema,
  trend: z.array(PlanningTrendPointSchema).default([]),
  byStatus: z.array(PlanningBreakdownSchema).default([]),
  byProvince: z.array(PlanningBreakdownSchema).default([]),
  byCustomerType: z.array(PlanningBreakdownSchema).default([]),
  byRep: z.array(PlanningBreakdownSchema).default([]),
});

export type PlanningCustomerDto = z.infer<typeof PlanningCustomerSchema>;
export type PlanningStopDto = z.infer<typeof PlanningStopSchema>;
export type PlanningRepDto = z.infer<typeof PlanningRepSchema>;
export type PlanningKpiDto = z.infer<typeof PlanningKpiSchema>;
export type PlanningBoardDto = z.infer<typeof PlanningBoardSchema>;
export type PlanningCandidateDto = z.infer<typeof PlanningCandidateSchema>;
export type PlanningAnalyticsDto = z.infer<typeof PlanningAnalyticsSchema>;
export type AssignStopResultDto = z.infer<typeof AssignStopResultSchema>;
export type OptimizeResultDto = z.infer<typeof OptimizeResultSchema>;

/** The five orderings the server implements, as it spells them. */
export const OPTIMIZE_STRATEGY_WIRE = [
  'distance',
  'priority',
  'customerValue',
  'plannedTime',
  'territory',
] as const;

export type OptimizeStrategyWire = (typeof OPTIMIZE_STRATEGY_WIRE)[number];

export interface AssignStopInput {
  repId: string;
  visitDate: string;
  customerId: string;
  plannedArrival?: string;
  durationMinutes?: number;
}

// --- Fixture → contract projections ----------------------------------------

const WIRE_STATUS: Record<StopStatus, z.infer<typeof PlanningStopStatus>> = {
  Unassigned: 'pending',
  Assigned: 'pending',
  'In Progress': 'checkedIn',
  Completed: 'checkedOut',
  Skipped: 'missed',
};

const STRATEGY_FROM_WIRE: Record<OptimizeStrategyWire, OptimizeStrategy> = {
  distance: 'Distance',
  priority: 'Priority',
  customerValue: 'Customer Level',
  plannedTime: 'Planned Time',
  territory: 'Sales Territory',
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const planIdFor = (repId: string, date: string) => `PLAN-${repId}-${date.replace(/-/g, '')}`;
/** Plan ids carry the rep id, so a plan can be resolved without a plans table. */
const repIdFromPlan = (planId: string) => planId.replace(/^PLAN-/, '').replace(/-\d{8}$/, '');

/** Local wall-clock "HH:mm" on `date` as an ISO instant. */
function instantAt(date: string, hhmm: string): string {
  const at = new Date(`${date}T${hhmm}:00`);
  return Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString();
}

function toCustomerDto(c: Customer): PlanningCustomerDto {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    status: c.creditStatus === 'On Hold' ? 'onHold' : 'active',
    territory: c.province,
    district: c.district,
    province: c.province,
    city: c.district,
    address: c.address,
    contactPerson: c.contactPerson,
    phone: c.phone,
    location: { latitude: c.lat, longitude: c.lng },
    creditLimit: c.creditLimit,
    creditBalance: c.outstanding,
    currency: 'USD',
    lifetimeValue: c.lifetimeValue,
    totalOrders: c.totalVisits,
    lastOrderDate: null,
    lastVisitDate: c.lastVisit,
    assignedSalesRepId: null,
  };
}

function toStopDto(stop: Stop, date: string): PlanningStopDto {
  const rep = salesReps.find((r) => r.id === stop.repId);
  const customer = customersById[stop.customerId];
  return {
    id: stop.id,
    planId: planIdFor(stop.repId ?? '', date),
    repId: stop.repId ?? '',
    repName: rep?.name ?? null,
    sequence: stop.seq,
    status: WIRE_STATUS[stop.status],
    plannedArrival: instantAt(date, stop.plannedStart),
    plannedDeparture: instantAt(date, minutesToHHMM(hhmmToMinutes(stop.plannedStart) + stop.estimatedMinutes)),
    actualArrival: stop.actualStart ? instantAt(date, stop.actualStart) : null,
    actualDeparture: stop.actualEnd ? instantAt(date, stop.actualEnd) : null,
    estimatedMinutes: stop.estimatedMinutes,
    distanceFromPreviousKm: stop.distanceKm,
    canEdit: stop.status === 'Assigned' || stop.status === 'Unassigned',
    customer: customer ? toCustomerDto(customer) : null,
  };
}

function toRepDto(rep: SalesRep, route: Stop[], date: string): PlanningRepDto {
  const depot = depotsById[route[0]?.depotId ?? ''] ?? depots.find((d) => d.province === rep.province) ?? depots[0];
  const minutes = route.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  return {
    id: rep.id,
    name: rep.name,
    email: `${rep.name.toLowerCase().replace(/\s+/g, '.')}@isigroup.com.kh`,
    phoneNumber: rep.phone,
    employeeCode: rep.employeeId,
    territory: rep.province,
    depotCode: depot.code,
    isActive: rep.status !== 'Offline',
    planId: route.length ? planIdFor(rep.id, date) : null,
    routeStatus: rep.status === 'On Route' ? 'inProgress' : route.length ? 'published' : null,
    assignedStops: route.length,
    completedStops: route.filter((s) => s.status === 'Completed').length,
    capacity: rep.capacity,
    plannedDistanceKm: Number(route.reduce((sum, s) => sum + s.distanceKm, 0).toFixed(1)),
    plannedMinutes: minutes,
    lastKnownLocation: { latitude: rep.lat, longitude: rep.lng, accuracyMetres: 12 },
    lastSeenAt: new Date(Date.now() - (rep.online ? 2 : 180) * 60_000).toISOString(),
  };
}

function kpisFor(all: Stop[], repCount: number): PlanningKpiDto {
  const scheduled = all.filter((s) => s.repId);
  const completed = scheduled.filter((s) => s.status === 'Completed').length;
  const distance = scheduled.reduce((sum, s) => sum + s.distanceKm, 0);
  const pool = all.length - scheduled.length;
  return {
    totalStops: scheduled.length,
    completedStops: completed,
    inProgressStops: scheduled.filter((s) => s.status === 'In Progress').length,
    pendingStops: scheduled.filter((s) => s.status === 'Assigned').length,
    missedStops: scheduled.filter((s) => s.status === 'Skipped').length,
    unscheduledCustomers: pool,
    repsWithRoutes: new Set(scheduled.map((s) => s.repId)).size,
    totalReps: repCount,
    coveragePercent: all.length ? Math.round((scheduled.length / all.length) * 100) : 0,
    completionPercent: scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0,
    totalDistanceKm: Number(distance.toFixed(1)),
    averageDistanceKm: scheduled.length ? Number((distance / scheduled.length).toFixed(1)) : null,
    plannedMinutes: scheduled.reduce((sum, s) => sum + s.estimatedMinutes, 0),
  };
}

function breakdown(rows: Stop[], keyOf: (s: Stop) => string): PlanningAnalyticsDto['byStatus'] {
  const map = new Map<string, { scheduledStops: number; completedStops: number }>();
  rows.forEach((s) => {
    const key = keyOf(s);
    const entry = map.get(key) ?? { scheduledStops: 0, completedStops: 0 };
    entry.scheduledStops += 1;
    if (s.status === 'Completed') entry.completedStops += 1;
    map.set(key, entry);
  });
  return Array.from(map, ([key, v]) => ({ key, ...v })).sort((a, b) => b.scheduledStops - a.scheduledStops);
}

/** Business-rule refusals, shaped like the errors the pages already describe. */
function refuse(message: string): never {
  throw Object.assign(new Error(message), { status: 422, kind: 'business' });
}

// --- Endpoints -------------------------------------------------------------

export const planningApi = {
  /** One day's whole board: reps, their stops, the customers behind them, the KPIs. */
  getBoard: async (
    query: { date?: string; repId?: string; territory?: string } = {},
    signal?: AbortSignal
  ): Promise<PlanningBoardDto> => {
    const date = query.date ?? todayIso();
    const all = stopsStore.get();
    const reps = salesReps.filter(
      (r) => (!query.repId || r.id === query.repId) && (!query.territory || r.province === query.territory)
    );
    const repIds = new Set(reps.map((r) => r.id));
    const scheduled = all.filter((s) => s.repId && repIds.has(s.repId));
    return mockResolve(
      {
        date,
        kpis: kpisFor(all, reps.length),
        reps: reps.map((rep) =>
          toRepDto(rep, scheduled.filter((s) => s.repId === rep.id).sort((a, b) => a.seq - b.seq), date)
        ),
        stops: scheduled.map((s) => toStopDto(s, date)),
      },
      signal
    );
  },

  /** The unscheduled pool for a day, paged and filterable. */
  getCandidates: async (query: QueryParams = {}, signal?: AbortSignal) => {
    const search = String(query.search ?? '').trim().toLowerCase();
    const rows = stopsStore
      .get()
      .filter((s) => !s.repId)
      .map((s) => customersById[s.customerId])
      .filter((c): c is Customer => Boolean(c))
      .filter((c) => !query.province || c.province === query.province)
      .filter((c) => !query.district || c.district === query.district)
      .filter((c) => !search || `${c.name} ${c.code} ${c.district}`.toLowerCase().includes(search));
    const page = paginate(rows, Number(query.pageNumber ?? 1), Number(query.pageSize ?? 20));
    return mockResolve(
      {
        items: page.items.map((c) => ({
          customer: toCustomerDto(c),
          daysSinceLastVisit: daysSince(c.lastVisit),
          scheduledElsewhere: false,
        })),
        totalCount: page.total,
      },
      signal
    );
  },

  /** Puts one customer on one representative's day. Creates the route if needed. */
  assignStop: async (input: AssignStopInput, signal?: AbortSignal): Promise<AssignStopResultDto> => {
    await mockDelay(undefined, signal);
    const all = stopsStore.get();
    const createdPlan = !all.some((s) => s.repId === input.repId);
    const existing = all.find((s) => s.customerId === input.customerId);
    if (existing?.repId && existing.repId !== input.repId) {
      refuse('This customer is already on another representative’s route for the day.');
    }
    if (!customersById[input.customerId]) refuse('Customer not found.');

    const stop: Stop = existing
      ? { ...existing, repId: input.repId, status: 'Assigned' }
      : {
          id: mockId('STP'),
          seq: 0,
          customerId: input.customerId,
          depotId: depots[0].id,
          repId: input.repId,
          priority: 'Medium',
          status: 'Assigned',
          plannedStart: input.plannedArrival ?? '08:00',
          estimatedMinutes: input.durationMinutes ?? 45,
          distanceKm: 0,
          visitReason: 'Scheduled call',
          notes: '',
          orderValue: 0,
          photos: 0,
          scheduledDate: input.visitDate,
        };
    const others = all.filter((s) => s.id !== stop.id);
    const route = [...others.filter((s) => s.repId === input.repId).sort((a, b) => a.seq - b.seq), stop];
    const next = stopsStore.update(() => withRoute([...others, stop], input.repId, route));
    const saved = next.find((s) => s.id === stop.id)!;
    return {
      stopId: saved.id,
      planId: planIdFor(input.repId, input.visitDate),
      sequence: saved.seq,
      plannedArrival: instantAt(input.visitDate, saved.plannedStart),
      plannedDeparture: instantAt(
        input.visitDate,
        minutesToHHMM(hhmmToMinutes(saved.plannedStart) + saved.estimatedMinutes)
      ),
      createdPlan,
    };
  },

  /** Takes one stop off a day. Refused once the representative has reached it. */
  unassignStop: async (stopId: string, signal?: AbortSignal): Promise<void> => {
    await mockDelay(undefined, signal);
    const all = stopsStore.get();
    const stop = all.find((s) => s.id === stopId);
    if (!stop) refuse('Stop not found.');
    if (stop.status === 'Completed' || stop.status === 'In Progress') {
      refuse('The representative has already reached this stop.');
    }
    const repId = stop.repId;
    stopsStore.update((current) => {
      const next = current.map((s) =>
        s.id === stopId ? { ...s, repId: null, status: 'Unassigned' as const, seq: 0 } : s
      );
      if (!repId) return next;
      return withRoute(next, repId, next.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq));
    });
  },

  /**
   * Rearranges a plan.
   *
   * `stopIds` must be every stop on the route exactly once — a partial order is refused
   * rather than applied to the prefix, as the server did.
   */
  reorderStops: async (planId: string, stopIds: string[], signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const repId = repIdFromPlan(planId);
    const route = stopsStore.get().filter((s) => s.repId === repId);
    const same = route.length === stopIds.length && route.every((s) => stopIds.includes(s.id));
    if (!same) refuse('The new order must list every stop on the route exactly once.');
    let next = stopsStore.get();
    stopIds.forEach((id, index) => {
      next = moveWithinRoute(next, repId, id, index);
    });
    stopsStore.set(next);
    return { planId, stopIds };
  },

  /** Reorders a plan by one of the five strategies. */
  optimizePlan: async (planId: string, strategy: OptimizeStrategyWire, signal?: AbortSignal) => {
    await mockDelay(700, signal);
    const repId = repIdFromPlan(planId);
    const before = stopsStore.get();
    const km = (rows: Stop[]) =>
      Number(rows.filter((s) => s.repId === repId).reduce((sum, s) => sum + s.distanceKm, 0).toFixed(1));
    const result = optimizeRoutes(before, [repId], STRATEGY_FROM_WIRE[strategy]);
    stopsStore.set(result.stops);
    return {
      planId,
      strategy,
      stopsMoved: result.moved,
      distanceBeforeKm: km(before),
      distanceAfterKm: km(result.stops),
      stops: result.stops.filter((s) => s.repId === repId),
    } satisfies OptimizeResultDto;
  },

  /**
   * Aggregates for the analytics screen. Window defaults to this month to date.
   *
   * The breakdowns count the current board; the daily trend spreads the same volume
   * across the window with a steady weekday rhythm so the chart reads like real history.
   */
  getAnalytics: async (
    query: { from?: string; to?: string; repId?: string; territory?: string } = {},
    signal?: AbortSignal
  ): Promise<PlanningAnalyticsDto> => {
    const now = new Date();
    const from = query.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = query.to ?? todayIso();
    const all = stopsStore.get().filter((s) => {
      if (query.repId && s.repId !== query.repId) return false;
      if (query.territory && customersById[s.customerId]?.province !== query.territory) return false;
      return true;
    });
    const scheduled = all.filter((s) => s.repId);
    const totals = kpisFor(all, salesReps.length);

    const trend: PlanningAnalyticsDto['trend'] = [];
    const cursor = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    let index = 0;
    while (cursor <= end && index < 370) {
      const weekday = cursor.getDay();
      const factor = weekday === 0 ? 0 : weekday === 6 ? 0.55 : 0.85 + ((index * 7) % 5) * 0.06;
      const planned = Math.round(scheduled.length * factor);
      const completed = Math.round(planned * (0.78 + ((index * 3) % 4) * 0.04));
      trend.push({
        date: cursor.toISOString().slice(0, 10),
        scheduledStops: planned,
        completedStops: completed,
        missedStops: Math.max(0, Math.round((planned - completed) * 0.4)),
        activeReps: planned ? Math.min(totals.repsWithRoutes, Math.round(totals.repsWithRoutes * factor)) : 0,
        distanceKm: Number((totals.totalDistanceKm * factor).toFixed(1)),
      });
      cursor.setDate(cursor.getDate() + 1);
      index += 1;
    }

    return mockResolve(
      {
        from,
        to,
        totals,
        trend,
        byStatus: breakdown(scheduled, (s) => WIRE_STATUS[s.status]),
        byProvince: breakdown(scheduled, (s) => customersById[s.customerId]?.province ?? 'Unknown'),
        byCustomerType: breakdown(scheduled, (s) => customersById[s.customerId]?.type ?? 'Unknown'),
        byRep: breakdown(scheduled, (s) => salesReps.find((r) => r.id === s.repId)?.name ?? 'Unknown'),
      },
      signal
    );
  },
};
