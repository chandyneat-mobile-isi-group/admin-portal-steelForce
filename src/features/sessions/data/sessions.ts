import { salesReps } from '@/features/planning/data/demo-data';
import { makeRng } from '@/lib/utilities/random';
import type { AdminSession } from '../types';

/**
 * Seed for the Sessions & Devices board: the field team's signed-in handsets plus the
 * office laptops a few supervisors also use. Timestamps are relative to first load so
 * "online" (active in the last 20 minutes) still means something on the board.
 */

const HANDSETS = [
  { model: 'Samsung Galaxy A54', os: 'Android 14' },
  { model: 'Samsung Galaxy A35', os: 'Android 14' },
  { model: 'OPPO A78', os: 'Android 13' },
  { model: 'Vivo Y36', os: 'Android 13' },
  { model: 'iPhone 13', os: 'iOS 17.6' },
  { model: 'Xiaomi Redmi Note 13', os: 'Android 14' },
];

const LAPTOPS = [
  { model: 'Chrome on Windows', os: 'Windows 11' },
  { model: 'Edge on Windows', os: 'Windows 11' },
  { model: 'Safari on macOS', os: 'macOS 14' },
];

const APP_VERSIONS = ['2.8.1', '2.8.1', '2.8.0', '2.7.4'];

const LOCATION_LABELS: Record<string, string[]> = {
  'Phnom Penh': [
    'Norodom Blvd, Chamkar Mon',
    'Russian Federation Blvd, Toul Kork',
    'Monivong Blvd, Daun Penh',
    'National Road 2, Chbar Ampov',
    'Hun Sen Blvd, Mean Chey',
    'Street 271, Toul Kork',
  ],
  Kandal: ['National Road 2, Ta Khmau', 'National Road 1, Kien Svay'],
  Battambang: ['National Road 5, Battambang City', 'Street 3, Svay Por'],
  'Siem Reap': ['Airport Road, Siem Reap City', 'Sivatha Blvd, Siem Reap'],
  'Kampong Speu': ['National Road 4, Chbar Mon', 'Odongk Market, Kampong Speu'],
};

export function buildSessions(): AdminSession[] {
  const rng = makeRng(552019);
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const sessions: AdminSession[] = [];

  salesReps.forEach((rep, i) => {
    const handset = HANDSETS[i % HANDSETS.length];
    const online = rep.status !== 'Offline';
    const lastActiveMinutes = online ? rng.int(1, 14) : rng.int(95, 60 * 30);
    // Two reps have never sent telemetry; the board says so rather than guessing.
    const located = i !== 7 && i !== 16;

    sessions.push({
      id: `SES-${String(i + 1).padStart(3, '0')}`,
      repId: rep.id,
      repName: rep.name,
      repEmployeeCode: rep.employeeId,
      status: online ? 'online' : 'offline',
      lastActive: iso(lastActiveMinutes),
      createdAt: iso(lastActiveMinutes + rng.int(60 * 4, 60 * 24 * 6)),
      expiresAt: new Date(now + rng.int(5, 29) * 86_400_000).toISOString(),
      ipAddress: `10.20.${rng.int(1, 40)}.${rng.int(2, 250)}`,
      device: {
        type: 'mobile',
        os: handset.os,
        appVersion: rng.pick(APP_VERSIONS),
        model: handset.model,
      },
      location: located
        ? {
            lat: rep.lat,
            lng: rep.lng,
            label: `${rng.pick(LOCATION_LABELS[rep.province] ?? LOCATION_LABELS['Phnom Penh'])}, ${rep.province}`,
            capturedAt: iso(lastActiveMinutes + rng.int(0, 6)),
          }
        : null,
      revokedAt: null,
    });

    // Team leads also keep a portal session open on an office laptop.
    if (i % 5 === 0) {
      const laptop = LAPTOPS[(i / 5) % LAPTOPS.length];
      const minutes = rng.int(3, 50);
      sessions.push({
        id: `SES-${String(i + 1).padStart(3, '0')}-W`,
        repId: rep.id,
        repName: rep.name,
        repEmployeeCode: rep.employeeId,
        status: minutes <= 20 ? 'online' : 'offline',
        lastActive: iso(minutes),
        createdAt: iso(minutes + rng.int(60, 60 * 9)),
        expiresAt: new Date(now + 7 * 86_400_000).toISOString(),
        ipAddress: `203.144.${rng.int(64, 95)}.${rng.int(2, 250)}`,
        device: { type: 'desktop', os: laptop.os, appVersion: '3.4.0', model: laptop.model },
        location: {
          lat: 11.5264 + (rng.rand() - 0.5) * 0.004,
          lng: 104.9282 + (rng.rand() - 0.5) * 0.004,
          label: 'ISI Group head office, Hun Sen Blvd, Phnom Penh',
          capturedAt: iso(minutes + 2),
        },
        revokedAt: null,
      });
    }
  });

  return sessions;
}
