import { crmDepots } from '@/features/depots/data/crm';
import { depots, salesReps } from '@/features/planning/data/demo-data';
import { makeRng } from '@/lib/utilities/random';

/**
 * Seed for the field-visit monitor: today's check-ins across the working reps.
 *
 * Every visit is a real depot from the CRM directory on a real rep's route, so the
 * customer a supervisor sees here is the one on the Stop Planning map. Times are
 * stored as local "HH:mm" and projected onto whichever day is asked for, so the
 * board always reads as "today" however long the prototype has been running.
 */

export type VisitWireStatus = 'pending' | 'enRoute' | 'arrived' | 'checkedIn' | 'checkedOut' | 'missed';
export type FraudSeverityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type FraudCodeValue =
  | 'MOCK_LOCATION'
  | 'IMPOSSIBLE_SPEED'
  | 'VPN_DETECTED'
  | 'POOR_ACCURACY'
  | 'OUTSIDE_GEOFENCE'
  | 'DISTANCE_MISMATCH';

export interface VisitRecord {
  id: string;
  routeId: string;
  repId: string;
  repName: string;
  customerId: string;
  customerName: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  status: VisitWireStatus;
  plannedTime: string;
  durationMinutes: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  fraudSeverity: FraudSeverityLevel;
  fraudCodes: FraudCodeValue[];
  hasOverride: boolean;
  overrideReason: string | null;
  photoCount: number;
  reportedDistanceMetres: number | null;
  verifiedDistanceMetres: number | null;
  /** ISO day for visits created by a published route; null for the daily seed. */
  date: string | null;
}

/** Steel lines a rep counts during a stock audit. */
export const AUDIT_ITEMS = [
  { itemId: 'DB-10', name: 'Deformed bar SD390 · 10 mm' },
  { itemId: 'DB-12', name: 'Deformed bar SD390 · 12 mm' },
  { itemId: 'DB-16', name: 'Deformed bar SD390 · 16 mm' },
  { itemId: 'GI-P34', name: 'GI pipe · 3/4 in' },
  { itemId: 'GI-P1', name: 'GI pipe · 1 in' },
  { itemId: 'RF-CC045', name: 'Colour-coated roofing · 0.45 mm' },
  { itemId: 'RF-ZA035', name: 'Zinc-alum roofing · 0.35 mm' },
  { itemId: 'HB-150', name: 'H-beam · 150 × 150' },
  { itemId: 'WM-6', name: 'Welded wire mesh · 6 mm' },
] as const;

const OVERRIDE_REASONS = [
  'Shop relocated two doors down; supervisor confirmed by phone',
  'Weak GPS inside the steel warehouse; QR code scanned at counter',
  'Owner met the rep at the Chbar Ampov branch instead',
];

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** The mix of integrity findings across the flagged check-ins. */
const SEVERITY_CYCLE: FraudSeverityLevel[] = ['medium', 'high', 'low', 'critical', 'high', 'medium'];

/** Visits per rep on the seeded day. */
const STOPS_PER_REP = 6;

export function buildVisitRecords(): VisitRecord[] {
  const rng = makeRng(730114);
  const working = salesReps.filter((r) => r.status !== 'Offline').slice(0, 8);
  const used = new Set<string>();
  const records: VisitRecord[] = [];
  let flagCount = 0;

  working.forEach((rep, repIndex) => {
    const pool = crmDepots.filter((d) => d.province === rep.province && !used.has(d.id));
    const fallback = crmDepots.filter((d) => !used.has(d.id));
    const route = (pool.length >= STOPS_PER_REP ? pool : fallback).slice(0, STOPS_PER_REP);
    // Progress through the day differs per rep so the board has every state at once.
    const done = [1, 2, 3, 2, 4, 1, 3, 2, 0][repIndex] ?? 2;

    route.forEach((depot, k) => {
      used.add(depot.id);
      const plannedTime = addMinutes('08:00', k * 70 + rng.int(0, 10));
      const duration = rng.int(25, 55);
      let status: VisitWireStatus = 'pending';
      if (k < done) status = 'checkedOut';
      else if (k === done) status = rep.status === 'On Route' ? 'enRoute' : rng.pick(['arrived', 'checkedIn'] as const);
      if (repIndex === 4 && k === 1) status = 'missed';

      const checkInTime =
        status === 'checkedOut' || status === 'checkedIn' || status === 'arrived'
          ? addMinutes(plannedTime, rng.int(-6, 18))
          : null;
      const checkOutTime = status === 'checkedOut' && checkInTime ? addMinutes(checkInTime, duration) : null;

      // A handful of check-ins carry integrity flags so the alert queue has content.
      const flagged = checkInTime !== null && records.length % 3 === 1;
      if (flagged) flagCount += 1;
      const severity: FraudSeverityLevel = flagged ? SEVERITY_CYCLE[flagCount % SEVERITY_CYCLE.length] : 'none';
      const codes: FraudCodeValue[] = flagged
        ? severity === 'critical'
          ? ['MOCK_LOCATION', 'IMPOSSIBLE_SPEED']
          : [rng.pick(['OUTSIDE_GEOFENCE', 'POOR_ACCURACY', 'DISTANCE_MISMATCH', 'VPN_DETECTED'] as const)]
        : [];
      const overridden = flagged && severity !== 'critical' && rng.chance(0.5);
      const reported = checkInTime ? rng.int(8, flagged ? 640 : 85) : null;

      records.push({
        id: `VIS-${String(records.length + 1).padStart(4, '0')}`,
        routeId: `RTE-${rep.id}`,
        repId: rep.id,
        repName: rep.name,
        customerId: depot.id,
        customerName: depot.name,
        district: depot.district,
        province: depot.province,
        lat: depot.lat,
        lng: depot.lng,
        status,
        plannedTime,
        durationMinutes: duration,
        checkInTime,
        checkOutTime,
        fraudSeverity: severity,
        fraudCodes: codes,
        hasOverride: overridden,
        overrideReason: overridden ? rng.pick(OVERRIDE_REASONS) : null,
        photoCount: status === 'checkedOut' ? rng.int(1, 3) : status === 'checkedIn' ? 1 : 0,
        reportedDistanceMetres: reported,
        verifiedDistanceMetres: reported !== null ? Math.max(4, reported + rng.int(-12, flagged ? 380 : 15)) : null,
        date: null,
      });
    });
  });

  return records;
}

/** Where each rep's day starts: the depot nearest their territory. */
export function startDepotFor(province: string) {
  return depots.find((d) => d.province === province) ?? depots[0];
}
