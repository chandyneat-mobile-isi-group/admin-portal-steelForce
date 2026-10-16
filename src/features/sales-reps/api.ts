/**
 * The Sales Reps board's service boundary.
 *
 * Mirrors `AdminSalesRepsController` (`/api/v1/admin/sales-reps`) with the same shapes,
 * but the static prototype answers locally: representatives are read from the
 * user-management store (so an account created, suspended or re-territoried anywhere
 * shows here), and their figures come from the deterministic field history in
 * `data/field-activity.ts`. Nothing here performs a network request.
 *
 * ## What the platform does and does not know about a representative
 *
 * A "sales representative" is not a separate entity here — it is a user account holding
 * the `access.mobile` permission, which is the same rule that decides who may sign in to
 * the handset. So the identity fields (name, e-mail, territory, depot, roles) are real
 * and authoritative.
 *
 * The **performance** figures are counted live from route stops. There is no scorecard
 * table and no nightly rollup, which is deliberate: a second set of numbers would
 * disagree with the visits board the first time a stop was re-synced.
 *
 * Consequently there is **no monthly target, no revenue, no order count and no star
 * rating** on this endpoint, and the backend contract says so explicitly — those are HR
 * and finance figures that live in no table on this platform. `successRate` is
 * completion against what was *scheduled*, which the platform does know. Anything on
 * screen claiming otherwise would be invented here in the browser, which is no better
 * than inventing it on the server.
 */
import { z } from 'zod';
import { ApiError } from '@/domain/errors/api-error';
import { mockDelay, paginate, type QueryParams } from '@/services/mock';
// The user store is the prototype's single record of who the field team is.
import { roleRecords, updateUser, userRecords, type UserRecord } from '@/features/users/data/mock-store';
import { sapSalesEmployees } from '@/features/users/data/sales-employees';
import {
  dayKey,
  eachDay,
  parseDay,
  planningRep,
  visitsOn,
  type RepTimeline,
  type VisitOutcome,
} from './data/field-activity';

/**
 * Field performance over a window, counted from route stops.
 *
 * `successRate` is null when nothing was scheduled — **not zero**. Zero reads as a
 * representative who failed every call; null is a representative who was given none,
 * and a board that renders them the same way libels somebody.
 */
export const RepMetricsSchema = z.object({
  from: z.string(),
  to: z.string(),
  scheduledVisits: z.number().default(0),
  completedVisits: z.number().default(0),
  missedVisits: z.number().default(0),
  successRate: z.number().nullable().optional(),
  flaggedVisits: z.number().default(0),
});

export const SalesRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  /** The sales territory. The API calls this `zone`. */
  zone: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  roles: z.array(z.string()).default([]),
  /** False when the field account is suspended and cannot sign in. */
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().nullable().optional(),
  metrics: RepMetricsSchema,
});

/** One entry in a representative's recent field activity. */
export const RepActivitySchema = z.object({
  type: z.enum(['checkIn', 'checkOut', 'missed']).catch('checkIn'),
  timestamp: z.string(),
  visitId: z.string(),
  customerId: z.string(),
  customerName: z.string().nullable().optional(),
});

/** The route header the detail endpoint returns for today. */
export const RepActiveRouteSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    territory: z.string().nullable().optional(),
    visitDate: z.string(),
    status: z.string(),
    stopCount: z.number().default(0),
    completedStopCount: z.number().default(0),
    estimatedDistanceKm: z.number().nullable().optional(),
  })
  .passthrough();

export const SalesRepDetailSchema = z.object({
  rep: SalesRepSchema,
  joinDate: z.string(),
  activeRoute: RepActiveRouteSchema.nullable().optional(),
  recentActivity: z.array(RepActivitySchema).default([]),
});

export const SalesRepPageSchema = z.object({
  items: z.array(SalesRepSchema).default([]),
  totalCount: z.number().default(0),
});

/**
 * The role this board lists.
 *
 * `access.mobile` is also held by supervisors and managers, so the endpoint returns
 * them too. The board is for the field team only, and the endpoint has no role filter,
 * so the rows are narrowed to this role in the browser.
 */
export const SALES_REP_ROLE = 'Sales Representative';

export function isSalesRepRole(roleName: string): boolean {
  return roleName.trim().toLowerCase() === SALES_REP_ROLE.toLowerCase();
}

export function isSalesRepresentative(rep: { roles: readonly string[] }): boolean {
  return rep.roles.some(isSalesRepRole);
}

export type RepMetricsDto = z.infer<typeof RepMetricsSchema>;
export type SalesRepDto = z.infer<typeof SalesRepSchema>;
export type SalesRepDetailDto = z.infer<typeof SalesRepDetailSchema>;
export type RepActivityDto = z.infer<typeof RepActivitySchema>;

export interface SalesRepListQuery extends QueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  territoryCode?: string;
  /** Start of the metrics window. Defaults server-side to the first of this month. */
  from?: string;
  /** End of the metrics window, inclusive. Defaults server-side to today. */
  to?: string;
}

/** Fields a PATCH may change. Omitted fields are left alone. */
export interface UpdateSalesRepInput {
  /** New sales territory. Send an empty string to clear it. */
  zone?: string;
  /** `active` or `suspended`. Suspending additionally requires `users.deactivate`. */
  status?: 'active' | 'suspended';
}

/** Roles that hold `access.mobile` — the endpoint returns all of them; the board narrows. */
const MOBILE_ROLES = new Set(['sales representative', 'sales supervisor']);

function startOfMonth(): string {
  const today = new Date();
  return dayKey(new Date(today.getFullYear(), today.getMonth(), 1));
}

function roleNames(user: UserRecord): string[] {
  const role = roleRecords().find((r) => r.id === user.role_id);
  return role ? [role.name] : [];
}

function mobileUsers(): UserRecord[] {
  return userRecords().filter((u) => roleNames(u).some((name) => MOBILE_ROLES.has(name.toLowerCase())));
}

function timelineOf(user: UserRecord): RepTimeline {
  return {
    repId: user.id,
    since: new Date(user.join_date ?? user.created_at),
    // A suspended account stops being scheduled from its last sign-in.
    until: user.account_status === 'active' ? null : new Date(user.last_login ?? user.updated_at),
  };
}

function metricsFor(user: UserRecord, window: { from?: string; to?: string }): RepMetricsDto {
  const from = window.from ?? startOfMonth();
  const to = window.to ?? dayKey(new Date());
  const timeline = timelineOf(user);
  let scheduledVisits = 0;
  let completedVisits = 0;
  let missedVisits = 0;
  let flaggedVisits = 0;

  for (const day of eachDay(parseDay(from), parseDay(to))) {
    for (const visit of visitsOn(timeline, day)) {
      scheduledVisits += 1;
      if (visit.state === 'completed') completedVisits += 1;
      if (visit.state === 'missed') missedVisits += 1;
      if (visit.flagged) flaggedVisits += 1;
    }
  }

  return {
    from,
    to,
    scheduledVisits,
    completedVisits,
    missedVisits,
    // Null, not zero, when nothing was scheduled — see RepMetricsSchema.
    successRate: scheduledVisits ? Math.round((completedVisits / scheduledVisits) * 100) : null,
    flaggedVisits,
  };
}

function toDto(user: UserRecord, window: { from?: string; to?: string } = {}): SalesRepDto {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    phoneNumber: user.phone,
    employeeCode: user.employee_id,
    zone: user.territory_code ?? null,
    depotCode: user.depot_code ?? null,
    roles: roleNames(user),
    isActive: user.account_status === 'active',
    lastLoginAt: user.last_login,
    metrics: metricsFor(user, window),
  };
}

function recentActivity(user: UserRecord, limit = 20): RepActivityDto[] {
  const timeline = timelineOf(user);
  const events: RepActivityDto[] = [];
  const now = new Date();
  const event = (type: RepActivityDto['type'], at: Date, visit: VisitOutcome): RepActivityDto => ({
    type,
    timestamp: at.toISOString(),
    visitId: visit.visitId,
    customerId: visit.customer.id,
    customerName: visit.customer.name,
  });

  for (let back = 0; back < 45 && events.length < limit; back += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - back);
    const visits = visitsOn(timeline, day, now).reverse();
    for (const visit of visits) {
      const end = new Date(visit.start.getTime() + visit.minutes * 60_000);
      if (visit.state === 'completed') events.push(event('checkOut', end, visit), event('checkIn', visit.start, visit));
      else if (visit.state === 'inProgress') events.push(event('checkIn', visit.start, visit));
      else if (visit.state === 'missed') events.push(event('missed', end, visit));
    }
  }
  return events.slice(0, limit);
}

function activeRoute(user: UserRecord): SalesRepDetailDto['activeRoute'] {
  const rep = planningRep(user.id);
  const today = new Date();
  const visits = visitsOn(timelineOf(user), today, today);
  if (!rep || visits.length === 0) return null;
  const done = visits.filter((v) => v.state === 'completed' || v.state === 'missed').length;
  const started = visits.some((v) => v.state !== 'open');
  return {
    id: `RT-${user.id}-${dayKey(today).replace(/-/g, '')}`,
    name: `${rep.province} · ${user.territory_code ?? rep.team}`,
    territory: user.territory_code ?? rep.province,
    visitDate: dayKey(today),
    status: done === visits.length ? 'Completed' : started ? 'In Progress' : 'Planned',
    stopCount: visits.length,
    completedStopCount: done,
    estimatedDistanceKm: Math.round(rep.distanceCovered),
  };
}

function findRep(repId: string): UserRecord {
  const user = mobileUsers().find((u) => u.id === repId);
  if (!user) throw new ApiError(404, 'not_found', 'api.error.not_found', { code: 'SalesRep.NotFound' });
  return user;
}

export const salesRepsApi = {
  /** Pages the field representatives with their performance for a window. */
  list: async (query: SalesRepListQuery = {}, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const term = query.search?.trim().toLowerCase();
    const rows = mobileUsers()
      .filter((u) => query.isActive === undefined || (u.account_status === 'active') === query.isActive)
      .filter((u) => !query.territoryCode || u.territory_code === query.territoryCode)
      .filter(
        (u) =>
          !term ||
          [u.full_name, u.email, u.employee_id].some((value) => (value ?? '').toLowerCase().includes(term))
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    const result = paginate(rows, query.pageNumber ?? 1, query.pageSize ?? 25);

    return SalesRepPageSchema.parse({
      items: result.items.map((u) => toDto(u, { from: query.from, to: query.to })),
      totalCount: result.total,
    });
  },

  /** One representative, today's route and their recent field activity. */
  get: async (repId: string, query: { from?: string; to?: string } = {}, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const user = findRep(repId);

    return SalesRepDetailSchema.parse({
      rep: toDto(user, query),
      joinDate: user.join_date ?? user.created_at,
      activeRoute: activeRoute(user),
      recentActivity: recentActivity(user),
    });
  },

  /**
   * Reassigns a territory, or suspends and reinstates an account.
   *
   * Writes through the same user store as the Users screen, so the change, its audit
   * entry and the session sign-out on suspension show there too.
   */
  update: async (repId: string, input: UpdateSalesRepInput, signal?: AbortSignal) => {
    findRep(repId);
    const updated = await updateUser(
      repId,
      {
        territory_code: input.zone === undefined ? undefined : input.zone.trim() || null,
        account_status: input.status === undefined ? undefined : input.status === 'active' ? 'active' : 'disabled',
      },
      signal,
      input.status === 'suspended' ? 'User Disabled' : input.status === 'active' ? 'User Enabled' : 'Territory Changed'
    );

    return SalesRepSchema.parse(toDto(findRep(updated.id)));
  },
};

// --- SAP sales employees ----------------------------------------------------

/**
 * One row of SAP's personnel master — **not** a field representative.
 *
 * See `AdminSalesEmployeesController`. A sales employee is a name SAP sends, stamped on
 * customer records to say who owns the account. A representative is a platform user
 * account that can sign in to the handset and be given a route. There are thousands of
 * the first and a handful of the second.
 */
export const SalesEmployeeSchema = z.object({
  personnelNumber: z.string(),
  fullName: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  deactivatedAt: z.string().nullable().optional(),
  synchronisedAt: z.string().nullable().optional(),
});

export const SalesEmployeePageSchema = z.object({
  items: z.array(SalesEmployeeSchema).default([]),
  totalCount: z.number().default(0),
});

export type SalesEmployeeDto = z.infer<typeof SalesEmployeeSchema>;

export interface SalesEmployeeListQuery extends QueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export const salesEmployeesApi = {
  /** Pages SAP's sales employee register. Search matches personnel number or name. */
  list: async (query: SalesEmployeeListQuery = {}, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const term = query.search?.trim().toLowerCase();
    const rows = sapSalesEmployees()
      .filter((e) => query.isActive === undefined || e.isActive === query.isActive)
      .filter((e) => !term || e.personnelNumber.includes(term) || (e.fullName ?? '').toLowerCase().includes(term))
      .slice()
      .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
    const result = paginate(rows, query.pageNumber ?? 1, query.pageSize ?? 50);

    return SalesEmployeePageSchema.parse({ items: result.items, totalCount: result.total });
  },
};
