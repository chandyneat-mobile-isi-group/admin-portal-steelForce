import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { buildVisitRecords, startDepotFor, type VisitRecord } from './data/visits';

/** One representative's latest reported position. */
export interface LivePosition {
  repId: string;
  repName: string | null;
  lat: number;
  lng: number;
  /** The fix's own accuracy estimate, in metres. */
  accuracyMetres: number | null;
  /** When the handset took the fix — not when we received it. */
  capturedAt: string;
  /** The device's own claim that the fix was faked. Testimony, never a finding. */
  isMocked: boolean;
}

/** How often the simulated field pushes a batch of fixes. */
const TICK_MS = 4_000;
/** Simulated hub handshake, so the "connecting" state is seen. */
const CONNECT_MS = 700;
/** Roughly 25 km/h through Phnom Penh traffic, per tick, in degrees. */
const STEP_DEGREES = 0.00025;

interface SimulatedRep {
  repId: string;
  repName: string;
  lat: number;
  lng: number;
  /** Remaining stops to drive to, in order. */
  targets: { lat: number; lng: number }[];
}

/** Starts each rep at their last reached visit, heading for the rest of their day. */
function seedSimulation(): SimulatedRep[] {
  const records = buildVisitRecords();
  const byRep = new Map<string, VisitRecord[]>();
  records.forEach((r) => byRep.set(r.repId, [...(byRep.get(r.repId) ?? []), r]));

  return Array.from(byRep, ([repId, visits]) => {
    const ordered = [...visits].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));
    const reached = ordered.filter((v) => v.checkInTime);
    const here = reached[reached.length - 1] ?? ordered[0];
    const start = reached.length ? here : startDepotFor(here.province);
    return {
      repId,
      repName: here.repName,
      lat: start.lat,
      lng: start.lng,
      targets: ordered.filter((v) => !v.checkInTime && v.status !== 'missed').map((v) => ({ lat: v.lat, lng: v.lng })),
    };
  });
}

/** Moves a rep one tick toward their next stop, with a little GPS wander. */
function advance(rep: SimulatedRep): SimulatedRep {
  const target = rep.targets[0];
  const jitter = () => (Math.random() - 0.5) * 0.00012;
  if (!target) return { ...rep, lat: rep.lat + jitter(), lng: rep.lng + jitter() };
  const dLat = target.lat - rep.lat;
  const dLng = target.lng - rep.lng;
  const distance = Math.hypot(dLat, dLng);
  if (distance <= STEP_DEGREES) {
    // Arrived: dwell here for a tick, then head on to the next stop.
    return { ...rep, lat: target.lat, lng: target.lng, targets: rep.targets.slice(1) };
  }
  const ratio = (STEP_DEGREES * (0.6 + Math.random() * 0.8)) / distance;
  return { ...rep, lat: rep.lat + dLat * ratio + jitter(), lng: rep.lng + dLng * ratio + jitter() };
}

/**
 * Live field positions — simulated in the prototype.
 *
 * The production hook subscribed to the field-tracking SignalR hub. Here the same
 * shape is fed by a local simulation: every rep with visits today drives from stop to
 * stop and reports a fix every few seconds. Keyed by **representative**, exactly as the
 * hub broadcast, so a rep signed in on two handsets still has one live position.
 *
 * Requires `visits.readall`, as the hub did; without it the hook never "connects".
 */
export function useLiveTracking() {
  const { can } = useAuth();
  const [positions, setPositions] = useState<Record<string, LivePosition>>({});
  const [isConnected, setIsConnected] = useState(false);
  const simulation = useRef<SimulatedRep[] | null>(null);

  const canReadAll = can('visits.readall');

  useEffect(() => {
    if (!canReadAll) return;

    let timer: number | undefined;
    const publish = () => {
      const capturedAt = new Date().toISOString();
      simulation.current = (simulation.current ?? seedSimulation()).map(advance);
      setPositions((prev) => {
        const next = { ...prev };
        simulation.current!.forEach((rep) => {
          next[rep.repId] = {
            repId: rep.repId,
            repName: rep.repName,
            lat: rep.lat,
            lng: rep.lng,
            accuracyMetres: Math.round(5 + Math.random() * 15),
            capturedAt,
            isMocked: false,
          };
        });
        return next;
      });
    };

    const connect = window.setTimeout(() => {
      setIsConnected(true);
      publish();
      timer = window.setInterval(publish, TICK_MS);
    }, CONNECT_MS);

    return () => {
      window.clearTimeout(connect);
      if (timer !== undefined) window.clearInterval(timer);
      setIsConnected(false);
    };
  }, [canReadAll]);

  const clearTracking = useCallback(() => setPositions({}), []);

  return { positions, clearTracking, isConnected };
}
