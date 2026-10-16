import { crmDepots, MY_REP_IDS } from '@/features/depots/data/crm';
import { makeRng } from '@/lib/utilities/random';
import { isoDate, TODAY } from '@/lib/utilities/demo-clock';
import { salesReps } from '@/features/planning/data/demo-data';

/** Field operations: today's visit list, check-in records and the activity log. */

export const VISIT_TYPES = ['Sales call', 'Stock check', 'Collection', 'Delivery follow-up', 'Prospecting'] as const;
export const VISIT_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Missed'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface FieldVisit {
  id: string;
  depotId: string;
  depotName: string;
  address: string;
  district: string;
  province: string;
  repId: string;
  scheduledAt: string;
  type: string;
  distanceKm: number;
  status: VisitStatus;
  purpose: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  durationMinutes: number | null;
}

const PURPOSES = [
  'Monthly stock replenishment review',
  'Introduce the new colour-coated roofing range',
  'Collect the outstanding invoice balance',
  'Confirm delivery schedule for the open order',
  'Assess the site for a project quotation',
  'Shelf display audit and price list update',
];

function buildVisits(): FieldVisit[] {
  const rng = makeRng(448291);
  const mine = crmDepots.filter((c) => MY_REP_IDS.includes(c.repId)).slice(0, 9);

  return mine.map((depot, i) => {
    const hour = 8 + i;
    // The morning is done, one visit is running, the afternoon is ahead —
    // so the page has something in each state without any interaction.
    const status: VisitStatus =
      i < 3 ? 'Completed' : i === 3 ? 'In Progress' : i === 4 && rng.chance(0.5) ? 'Missed' : 'Scheduled';

    const checkIn = status === 'Completed' || status === 'In Progress'
      ? `${String(hour).padStart(2, '0')}:${String(rng.int(2, 25)).padStart(2, '0')}`
      : null;
    const duration = status === 'Completed' ? rng.int(22, 68) : null;

    return {
      id: `VIS-${String(i + 1).padStart(3, '0')}`,
      depotId: depot.id,
      depotName: depot.name,
      address: depot.address,
      district: depot.district,
      province: depot.province,
      repId: depot.repId,
      scheduledAt: `${String(hour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
      type: rng.pick(VISIT_TYPES),
      distanceKm: Number(rng.float(0.4, 14).toFixed(1)),
      status,
      purpose: rng.pick(PURPOSES),
      checkInAt: checkIn,
      checkOutAt:
        status === 'Completed' && checkIn && duration
          ? addMinutes(checkIn, duration)
          : null,
      durationMinutes: duration,
    };
  });
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const todaysVisits: FieldVisit[] = buildVisits();

/** Demo GPS fix for the rep's device, near the Phnom Penh depot. */
export const CURRENT_LOCATION = {
  label: 'Norodom Blvd, Chamkar Mon, Phnom Penh',
  lat: 11.5479,
  lng: 104.9235,
  accuracyMetres: 8,
};

// ── Activities ──────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  'Call',
  'Visit',
  'Meeting',
  'Follow-up',
  'Quotation',
  'Task',
  'Email',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ['Planned', 'In Progress', 'Completed', 'Overdue'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_PRIORITIES = ['High', 'Medium', 'Low'] as const;

export interface Activity {
  id: string;
  type: ActivityType;
  depotId: string;
  depotName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  repId: string;
  priority: string;
  status: ActivityStatus;
  nextAction: string;
}

const ACTIVITY_TITLES: Record<ActivityType, string[]> = {
  Call: ['Follow up on the open quotation', 'Confirm the delivery window', 'Check payment status'],
  Visit: ['Monthly stock review', 'Site measurement visit', 'New product walkthrough'],
  Meeting: ['Annual contract review', 'Project kick-off with the contractor', 'Credit terms discussion'],
  'Follow-up': ['Chase the pending purchase order', 'Re-quote after the price update', 'Confirm sample feedback'],
  Quotation: ['Prepare the structural steel quotation', 'Revise the roofing package pricing'],
  Task: ['Update the depot master record', 'Collect the signed delivery notes'],
  Email: ['Send the August price list', 'Share the mill test certificates'],
};

function buildActivities(): Activity[] {
  const rng = makeRng(913377);
  const mine = crmDepots.filter((c) => MY_REP_IDS.includes(c.repId));

  return Array.from({ length: 42 }, (_, i) => {
    const depot = mine[(i * 5) % mine.length];
    const type = rng.pick(ACTIVITY_TYPES);
    // Spread across overdue / today / upcoming so every view tab has content.
    const offset = i < 8 ? -rng.int(1, 9) : i < 20 ? 0 : rng.int(1, 18);
    const completed = offset < 0 && rng.chance(0.55);

    const status: ActivityStatus = completed
      ? 'Completed'
      : offset < 0
        ? 'Overdue'
        : offset === 0 && rng.chance(0.25)
          ? 'In Progress'
          : 'Planned';

    return {
      id: `ACT-${String(i + 1).padStart(3, '0')}`,
      type,
      depotId: depot.id,
      depotName: depot.name,
      title: rng.pick(ACTIVITY_TITLES[type]),
      description: `${type} with ${depot.contactPerson} at ${depot.name}, ${depot.district}.`,
      date: isoDate(offset),
      time: `${String(rng.int(8, 17)).padStart(2, '0')}:${rng.chance(0.5) ? '00' : '30'}`,
      repId: depot.repId,
      priority: rng.weighted([
        ['High', 2],
        ['Medium', 5],
        ['Low', 3],
      ]),
      status,
      nextAction: rng.pick([
        'Log the outcome and set the next follow-up',
        'Raise a quotation if the depot confirms',
        'Escalate to the sales manager',
        'No further action required',
      ]),
    };
  });
}

export const activities: Activity[] = buildActivities();

export const TODAY_ISO = isoDate(0);

export function activityBucket(activity: Activity): 'today' | 'upcoming' | 'overdue' | 'completed' {
  if (activity.status === 'Completed') return 'completed';
  if (activity.date < TODAY_ISO) return 'overdue';
  if (activity.date === TODAY_ISO) return 'today';
  return 'upcoming';
}

export function repOptions() {
  return salesReps.map((r) => ({ value: r.id, label: r.name, hint: r.employeeId }));
}

export { TODAY };
