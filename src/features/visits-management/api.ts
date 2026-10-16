/**
 * Field-visit monitoring — a local mock service for the static prototype.
 *
 * The schemas are the backend's contracts and are still used to shape what the mock
 * returns, so consumers see exactly the types they did. Records live in
 * `data/visits.ts`, persisted through `createPersistentStore`; nothing here performs a
 * network request.
 */
import { z } from 'zod';
import {
  AUDIT_ITEMS,
  buildVisitRecords,
  startDepotFor,
  type FraudSeverityLevel,
  type VisitRecord,
} from './data/visits';
import { customersById, repsById } from '@/features/planning/data/demo-data';
import { makeRng } from '@/lib/utilities/random';
import {
  createPersistentStore,
  mockDelay,
  mockId,
  mockResolve,
  paginate,
  type QueryParams,
} from '@/services/mock';

// Schemas
export const VisitStatus = z.enum(['pending', 'enRoute', 'arrived', 'checkedIn', 'checkedOut', 'missed']);
export const FraudSeverity = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export const FraudCode = z.enum(['MOCK_LOCATION', 'IMPOSSIBLE_SPEED', 'VPN_DETECTED', 'POOR_ACCURACY', 'OUTSIDE_GEOFENCE', 'DISTANCE_MISMATCH', '*']).catch('*' as any); // Catch-all for unknown codes

const VisitFields = z.object({
  id: z.string().optional().catch(''), // Often visitId is the id
  visitId: z.string().optional(),
  routeId: z.string().optional(),
  repId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  repName: z.string().optional(),
  status: VisitStatus.catch('pending'),
  fraudSeverity: FraudSeverity.catch('none'),
  fraudCodes: z.array(FraudCode).optional().catch([]),
  hasOverride: z.boolean().optional(),
  overrideReason: z.string().optional().nullable(),
  checkedInAt: z.string().nullable().optional(),
  checkedOutAt: z.string().nullable().optional(),
  plannedArrival: z.string().nullable().optional(),
  plannedDeparture: z.string().nullable().optional(),
  hasProofPhoto: z.boolean().optional(),
  reportedDistanceMetres: z.number().nullable().optional(),
  verifiedDistanceMetres: z.number().nullable().optional(),
}).passthrough();

/**
 * A visit, with its identity settled at the boundary.
 *
 * The API names this field `id` on some routes and `visitId` on others, so `id` alone
 * is `undefined` often enough that React lists keyed on it warn and re-mount their rows
 * on every refetch. Resolving it once here means no consumer has to know which route
 * its data came from, and `id` is a string in every case.
 */
export const VisitSchema = VisitFields.transform((visit) => ({
  ...visit,
  id: visit.id || visit.visitId || '',
}));

export type Visit = z.infer<typeof VisitSchema>;

export const VisitPageSchema = z.object({
  items: z.array(VisitSchema),
  totalCount: z.number(),
}).passthrough();

export const PhotoSchema = z.object({
  id: z.string(),
  contentUrl: z.string().nullable(),
  uploadState: z.string(),
}).passthrough();

export const TelemetrySampleSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  capturedAt: z.string(),
}).passthrough();

export const FraudAlertSchema = z.object({
  id: z.string().optional(),
  visitId: z.string().optional(),
  repId: z.string(),
  repName: z.string().optional(),
  severity: FraudSeverity,
  code: FraudCode,
  blocked: z.boolean().optional(),
  capturedAt: z.string(),
  receivedAt: z.string().optional(),
}).passthrough();

export const FraudAlertPageSchema = z.object({
  items: z.array(FraudAlertSchema),
  totalCount: z.number(),
}).passthrough();

export const InventoryAuditSchema = z.object({
  itemId: z.string(),
  band: z.enum(['low', 'medium', 'high']).catch('medium'),
}).passthrough();

// --- Local data -------------------------------------------------------------

const visitsStore = createPersistentStore<VisitRecord[]>('visits.records', buildVisitRecords);

const SEVERITY_RANK: Record<FraudSeverityLevel, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Local "HH:mm" on `date` as an ISO instant. */
function at(date: string, hhmm: string | null): string | null {
  if (!hhmm) return null;
  const value = new Date(`${date}T${hhmm}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function seedFor(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

function toVisit(record: VisitRecord, date: string): Visit {
  return VisitSchema.parse({
    id: record.id,
    visitId: record.id,
    routeId: record.routeId,
    repId: record.repId,
    repName: record.repName,
    customerId: record.customerId,
    customerName: record.customerName,
    status: record.status,
    fraudSeverity: record.fraudSeverity,
    fraudCodes: record.fraudCodes,
    hasOverride: record.hasOverride,
    overrideReason: record.overrideReason,
    checkedInAt: at(date, record.checkInTime),
    checkedOutAt: at(date, record.checkOutTime),
    plannedArrival: at(date, record.plannedTime),
    plannedDeparture: at(date, addMinutes(record.plannedTime, record.durationMinutes)),
    hasProofPhoto: record.photoCount > 0,
    reportedDistanceMetres: record.reportedDistanceMetres,
    verifiedDistanceMetres: record.verifiedDistanceMetres,
    district: record.district,
    province: record.province,
  });
}

/** The seeded day plus anything published for `date`, in planned order. */
function recordsFor(date: string): VisitRecord[] {
  return visitsStore
    .get()
    .filter((r) => r.date === null || r.date === date)
    .sort((a, b) => a.plannedTime.localeCompare(b.plannedTime) || a.repName.localeCompare(b.repName));
}

function findRecord(visitId: string): VisitRecord {
  const record = visitsStore.get().find((r) => r.id === visitId);
  if (!record) throw Object.assign(new Error('Visit not found.'), { status: 404 });
  return record;
}

/**
 * A proof photo, drawn rather than fetched: a shopfront with the depot's initials and
 * the capture time, so the evidence strip is never a broken image.
 */
function proofPhotoSvg(record: VisitRecord, index: number): string {
  const initials = record.customerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const hue = (seedFor(record.customerId) + index * 47) % 360;
  const caption = `${record.checkInTime ?? ''} · ${['Shopfront', 'Stock shelf', 'Signed delivery note'][index % 3]}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,82%)"/><stop offset="1" stop-color="hsl(${hue},35%,62%)"/></linearGradient></defs>
<rect width="320" height="240" fill="url(#g)"/>
<rect x="40" y="70" width="240" height="130" rx="6" fill="hsl(${hue},25%,94%)"/>
<rect x="40" y="56" width="240" height="26" rx="4" fill="hsl(${hue},55%,38%)"/>
<rect x="70" y="110" width="70" height="90" fill="hsl(${hue},20%,70%)"/>
<rect x="160" y="110" width="90" height="50" fill="hsl(${hue},30%,80%)"/>
<text x="160" y="74" font-family="sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text>
<rect x="0" y="212" width="320" height="28" fill="rgba(0,0,0,0.45)"/>
<text x="10" y="231" font-family="sans-serif" font-size="12" fill="#fff">${caption.replace(/[<&>]/g, '')}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// API Endpoints
export const visitsApi = {
  listVisits: async (query: QueryParams = {}, signal?: AbortSignal) => {
    const date = typeof query.date === 'string' && query.date ? query.date : todayIso();
    const search = String(query.search ?? '').trim().toLowerCase();
    const rows = recordsFor(date)
      .filter((r) => !query.repId || r.repId === query.repId)
      .filter((r) => !query.status || r.status === query.status)
      .filter((r) => !search || `${r.customerName} ${r.repName} ${r.district}`.toLowerCase().includes(search));
    const page = paginate(rows, Number(query.pageNumber ?? 1), Number(query.pageSize ?? 20));
    return mockResolve(
      VisitPageSchema.parse({ items: page.items.map((r) => toVisit(r, date)), totalCount: page.total }),
      signal
    );
  },

  getVisit: async (visitId: string, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const record = findRecord(visitId);
    return toVisit(record, record.date ?? todayIso());
  },

  getPhotos: async (visitId: string, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const record = findRecord(visitId);
    return z.array(PhotoSchema).parse(
      Array.from({ length: record.photoCount }, (_, i) => ({
        id: `${record.id}-PH${i + 1}`,
        contentUrl: proofPhotoSvg(record, i),
        uploadState: 'uploaded',
      }))
    );
  },

  /**
   * A rep's breadcrumb for the day: depot, then every visit they have reached, sampled
   * every few minutes along the way.
   */
  getTelemetry: async (repId: string, query: QueryParams = {}, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const date = typeof query.date === 'string' && query.date ? query.date : todayIso();
    const rep = repsById[repId];
    const reached = recordsFor(date).filter((r) => r.repId === repId && r.checkInTime);
    const depot = startDepotFor(rep?.province ?? reached[0]?.province ?? 'Phnom Penh');
    const rng = makeRng(seedFor(repId + date));
    const samples: { lat: number; lng: number; capturedAt: string }[] = [];
    let from = { lat: depot.lat, lng: depot.lng, time: '07:45' };
    reached.forEach((visit) => {
      const steps = 6;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        samples.push({
          lat: from.lat + (visit.lat - from.lat) * t + (rng.rand() - 0.5) * 0.0008,
          lng: from.lng + (visit.lng - from.lng) * t + (rng.rand() - 0.5) * 0.0008,
          capturedAt: at(date, addMinutes(from.time, Math.round(i * 4)))!,
        });
      }
      from = { lat: visit.lat, lng: visit.lng, time: visit.checkOutTime ?? visit.checkInTime! };
    });
    return z.array(TelemetrySampleSchema).parse(samples);
  },

  getFraudAlerts: async (query: QueryParams = {}, signal?: AbortSignal) => {
    const minimum = (String(query.minimumSeverity ?? 'low') as FraudSeverityLevel) || 'low';
    const date = todayIso();
    const alerts = recordsFor(date)
      .filter((r) => SEVERITY_RANK[r.fraudSeverity] >= Math.max(1, SEVERITY_RANK[minimum] ?? 1))
      .flatMap((r) =>
        r.fraudCodes.map((code, i) => ({
          id: `${r.id}-FA${i + 1}`,
          visitId: r.id,
          repId: r.repId,
          repName: r.repName,
          customerName: r.customerName,
          severity: r.fraudSeverity,
          code,
          blocked: r.fraudSeverity === 'critical' && !r.hasOverride,
          capturedAt: at(date, r.checkInTime)!,
          receivedAt: at(date, r.checkInTime ? addMinutes(r.checkInTime, 1) : null) ?? undefined,
        }))
      )
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    const page = paginate(alerts, Number(query.pageNumber ?? 1), Number(query.pageSize ?? 20));
    return mockResolve(FraudAlertPageSchema.parse({ items: page.items, totalCount: page.total }), signal);
  },

  getInventory: async (visitId: string, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const record = findRecord(visitId);
    const rng = makeRng(seedFor(record.id));
    const items = AUDIT_ITEMS.filter(() => rng.chance(0.6)).map((item) => {
      const band = rng.weighted<'low' | 'medium' | 'high'>([['low', 2], ['medium', 4], ['high', 3]]);
      return { itemId: item.itemId, name: item.name, band };
    });
    return z.array(InventoryAuditSchema).parse(items);
  },

  /**
   * Publishes a route to the field app: one pending visit per stop, on the given day.
   * Accepts `{ repId, date?, stops: [{ customerId, plannedArrival? }] }`.
   */
  publishRoute: async (route: any, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const rep = repsById[route?.repId];
    if (!rep) throw Object.assign(new Error('Unknown sales rep.'), { status: 422 });
    const date: string = route.date ?? todayIso();
    const routeId = mockId('RTE');
    const stops: { customerId: string; plannedArrival?: string }[] = Array.isArray(route.stops) ? route.stops : [];
    const created: VisitRecord[] = stops
      .map((stop, i) => ({ stop, i, customer: customersById[stop.customerId] }))
      .filter(({ customer }) => customer)
      .map(({ stop, i, customer }) => ({
        id: mockId('VIS'),
        routeId,
        repId: rep.id,
        repName: rep.name,
        customerId: customer.id,
        customerName: customer.name,
        district: customer.district,
        province: customer.province,
        lat: customer.lat,
        lng: customer.lng,
        status: 'pending' as const,
        plannedTime: stop.plannedArrival ?? addMinutes('08:00', i * 60),
        durationMinutes: 45,
        checkInTime: null,
        checkOutTime: null,
        fraudSeverity: 'none' as const,
        fraudCodes: [],
        hasOverride: false,
        overrideReason: null,
        photoCount: 0,
        reportedDistanceMetres: null,
        verifiedDistanceMetres: null,
        date,
      }));
    visitsStore.update((current) => [...current, ...created]);
    return { routeId, visitsCreated: created.length };
  },
};
