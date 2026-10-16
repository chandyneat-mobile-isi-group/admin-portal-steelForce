import type { LatLng } from '../types';

/** Approximate metres per degree of latitude — good enough for a city-scale demo. */
const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Road distance is always longer than the straight line. 1.35 is the usual
 * detour factor quoted for dense urban grids, which is what Phnom Penh is.
 */
export function roadKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 1.35;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Whether a point can actually be drawn on a map.
 *
 * `toCustomer` and `toRepView` deliberately fall back to `Number.NaN` for a record the
 * backend has no fix for — (0, 0) is a real place in the Gulf of Guinea and would drag
 * every bound with it. NaN keeps such a record in the list and off the map, but only if
 * the map asks: handing NaN to `LatLngBounds.extend` poisons the whole bounds, and the
 * resulting `fitBounds` throws `setCenter: ... lat: NaN` for every point in the set.
 */
export function hasFix(point: { lat: number; lng: number } | null | undefined): boolean {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

export const PHNOM_PENH: LatLng = { lat: 11.5564, lng: 104.9282 };

export const PROVINCE_CENTERS: Record<string, LatLng> = {
  'Phnom Penh': { lat: 11.5564, lng: 104.9282 },
  Kandal: { lat: 11.4833, lng: 104.95 },
  Battambang: { lat: 13.0957, lng: 103.2022 },
  'Siem Reap': { lat: 13.3671, lng: 103.8448 },
  'Kampong Speu': { lat: 11.4531, lng: 104.5209 },
};

export function boundsOf(points: LatLng[], padRatio = 0.12): Bounds {
  if (points.length === 0) {
    return { minLat: 11.48, maxLat: 11.63, minLng: 104.83, maxLng: 105.0 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  // Degenerate spans (a single marker) would divide by zero when projecting.
  const latSpan = Math.max(maxLat - minLat, 0.02);
  const lngSpan = Math.max(maxLng - minLng, 0.02);
  const padLat = latSpan * padRatio;
  const padLng = lngSpan * padRatio;
  const cLat = (minLat + maxLat) / 2;
  const cLng = (minLng + maxLng) / 2;
  return {
    minLat: cLat - latSpan / 2 - padLat,
    maxLat: cLat + latSpan / 2 + padLat,
    minLng: cLng - lngSpan / 2 - padLng,
    maxLng: cLng + lngSpan / 2 + padLng,
  };
}

/**
 * Projects a coordinate into a 0..100 viewBox space. The map renders in a
 * `preserveAspectRatio="none"` SVG so percentage space is all we need, and it
 * keeps every marker position resolution independent.
 */
export function project(p: LatLng, b: Bounds): { x: number; y: number } {
  const x = ((p.lng - b.minLng) / (b.maxLng - b.minLng)) * 100;
  const y = ((b.maxLat - p.lat) / (b.maxLat - b.minLat)) * 100;
  return { x, y };
}

/** Total road distance for an ordered route starting and ending at the depot. */
export function routeDistanceKm(depot: LatLng, points: LatLng[]): number {
  if (points.length === 0) return 0;
  let total = roadKm(depot, points[0]);
  for (let i = 1; i < points.length; i += 1) {
    total += roadKm(points[i - 1], points[i]);
  }
  return total + roadKm(points[points.length - 1], depot);
}

/** Phnom Penh traffic averages roughly 22 km/h door to door. */
export function travelMinutes(km: number): number {
  return Math.round((km / 22) * 60);
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "08:30" → "08:30 AM"; used everywhere times are shown to the manager. */
export function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${mStr} ${suffix}`;
}

export function minutesToHHMM(minutes: number): string {
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = Math.round(clamped % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
