import {
  CUSTOMER_TYPES,
  DIVISIONS,
  PRIORITIES,
  PROVINCES,
  SALES_ORGS,
  TEAMS,
  type CallPlanImportBatch,
  type CallPlanItem,
  type CreditStatus,
  type Customer,
  type CustomerType,
  type Depot,
  type Division,
  type HistoryEvent,
  type PlannedActivity,
  type Priority,
  type Province,
  type RepStatus,
  type RepWeeklySchedule,
  type SalesOrg,
  type SalesRep,
  type Stop,
  type StopStatus,
} from '../types';
import { PROVINCE_CENTERS, roadKm } from '@/features/planning/lib/geo';

/**
 * Every value below comes from a seeded PRNG rather than Math.random, so the
 * server render and the client hydration agree. A mismatch here would show up
 * as React hydration errors on every page of the module.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: number) {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const float = (min: number, max: number) => min + rand() * (max - min);
  /** Sum of two uniforms — clusters values toward the centre like real cities do. */
  const spread = (radius: number) => (rand() + rand() - 1) * radius;
  const chance = (p: number) => rand() < p;
  return { rand, pick, int, float, spread, chance };
}

const FAMILY_NAMES = [
  'Sok', 'Chan', 'Heng', 'Meng', 'Kim', 'Ly', 'Sam', 'Vann', 'Nhem', 'Chea',
  'Keo', 'Pich', 'Ros', 'Sar', 'Tep', 'Ung', 'Yim', 'Bun', 'Sin', 'Nou',
  'Prak', 'Rith', 'Seng', 'Thy', 'Mao', 'Ouk',
];

const GIVEN_NAMES = [
  'Dara', 'Sokha', 'Vibol', 'Chantha', 'Sopheak', 'Rithy', 'Kanha', 'Sreymom',
  'Bopha', 'Sovann', 'Piseth', 'Malis', 'Nary', 'Veasna', 'Chhaya', 'Samnang',
  'Vichea', 'Kosal', 'Leakhena', 'Sothy', 'Ratana', 'Phalla', 'Sina', 'Davi',
  'Makara', 'Sopheap',
];

const BRAND_PREFIX = [
  'Lucky', 'Golden', 'New', 'Mekong', 'Angkor', 'Bayon', 'Royal', 'Sunrise',
  'Diamond', 'Star', 'Grand', 'Silver', 'Tonle', 'Bright', 'Modern', 'Global',
  'Prime', 'Phnom', 'Rising', 'Victory',
];

const BRAND_SUFFIX: Record<CustomerType, string[]> = {
  'Hardware Shop': ['Hardware', 'Hardware Store', 'Tools & Hardware'],
  'Steel Shop': ['Steel', 'Steel Trading', 'Steel Center'],
  Depot: ['Depot', 'Building Depot', 'Supply Depot'],
  Contractor: ['Construction', 'Builders', 'Engineering'],
  'Retail Shop': ['Retail', 'Store', 'Mart'],
  Distributor: ['Distributor', 'Trading Co.', 'Distribution'],
  'Construction Site': ['Site Project', 'Tower Project', 'Residence Project'],
  Outlet: ['Outlet', 'Showroom', 'Center'],
};

const DISTRICTS: Record<Province, string[]> = {
  'Phnom Penh': [
    'Chamkar Mon', 'Daun Penh', 'Prampi Makara', 'Tuol Kork', 'Dangkao',
    'Mean Chey', 'Russey Keo', 'Sen Sok', 'Pou Senchey', 'Chroy Changvar',
  ],
  Kandal: ['Ta Khmau', 'Kien Svay', 'Saang', 'Kandal Stung', 'Ponhea Leu'],
  Battambang: ['Battambang City', 'Banan', 'Thma Koul', 'Sangkae', 'Moung Ruessei'],
  'Siem Reap': ['Siem Reap City', 'Puok', 'Prasat Bakong', 'Angkor Chum', 'Sotr Nikum'],
  'Kampong Speu': ['Chbar Mon', 'Samraong Tong', 'Kong Pisei', 'Odongk', 'Phnom Sruoch'],
};

const STREETS = [
  'St. 271', 'St. 217', 'St. 598', 'National Road 5', 'National Road 1',
  'Monivong Blvd', 'Russian Federation Blvd', 'Kampuchea Krom Blvd',
  'Sihanouk Blvd', 'Norodom Blvd', 'Hun Sen Blvd', 'Veng Sreng Blvd',
  'Mao Tse Toung Blvd', 'St. 105', 'St. 371',
];

const WORKING_HOURS = [
  '07:00 – 17:00', '07:30 – 18:00', '08:00 – 17:30', '08:00 – 18:00',
  '06:30 – 16:30', '08:30 – 19:00',
];

const VISIT_REASONS = [
  'Monthly stock replenishment',
  'New product introduction',
  'Outstanding payment follow-up',
  'Price list update',
  'Order confirmation',
  'Shelf display audit',
  'Complaint resolution',
  'Contract renewal discussion',
  'Site delivery coordination',
  'Credit review meeting',
];

const VISIT_NOTES = [
  'Owner prefers morning visits before 10:00.',
  'Delivery truck access is via the rear gate.',
  'Ask for the purchasing officer, not the cashier.',
  'Shop closes for lunch between 12:00 and 13:30.',
  'Bring the updated roofing sheet catalogue.',
  'Confirm last invoice before taking a new order.',
  'Site foreman signs off on all deliveries.',
  'Parking is tight — use the corner lot.',
];

const CURRENT_LOCATIONS = [
  'Toul Kork, Phnom Penh', 'Sen Sok, Phnom Penh', 'Daun Penh, Phnom Penh',
  'Chamkar Mon, Phnom Penh', 'Mean Chey, Phnom Penh', 'Ta Khmau, Kandal',
  'Chroy Changvar, Phnom Penh', 'Pou Senchey, Phnom Penh',
];

const SHIFTS = ['08:00 – 17:00', '07:30 – 16:30', '08:30 – 17:30', '09:00 – 18:00'];

/** Landmarks the brief calls out by name — seeded first so they always exist. */
const FEATURED: Array<{ name: string; type: CustomerType; lat: number; lng: number }> = [
  { name: 'Lucky Hardware', type: 'Hardware Shop', lat: 11.5721, lng: 104.8925 },
  { name: 'Kim Steel', type: 'Steel Shop', lat: 11.5432, lng: 104.9187 },
  { name: 'Dara Construction', type: 'Construction Site', lat: 11.5895, lng: 104.9421 },
  { name: 'Meng Distributor', type: 'Distributor', lat: 11.5218, lng: 104.9563 },
  { name: 'Heng Retail', type: 'Retail Shop', lat: 11.5642, lng: 104.9702 },
  { name: 'Sokha Hardware', type: 'Hardware Shop', lat: 11.5341, lng: 104.8812 },
  { name: 'Angkor Roofing Outlet', type: 'Outlet', lat: 11.6012, lng: 104.9105 },
];

const TIER_BY_INDEX = ['Platinum', 'Gold', 'Silver', 'Bronze'] as const;

function padCode(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

// ── Depots ───────────────────────────────────────────────────────────────────

export const depots: Depot[] = [
  {
    id: 'DEP-01',
    code: 'PP-MAIN',
    name: 'ISI Depot — Phnom Penh',
    province: 'Phnom Penh',
    address: 'Hun Sen Blvd, Chak Angre Leu, Phnom Penh',
    salesOrg: 'ISI Steel',
    lat: 11.5264,
    lng: 104.9282,
  },
  {
    id: 'DEP-02',
    code: 'PP-NORTH',
    name: 'ISI Depot — Chroy Changvar',
    province: 'Phnom Penh',
    address: 'National Road 6A, Chroy Changvar, Phnom Penh',
    salesOrg: 'ISI Roofing',
    lat: 11.6041,
    lng: 104.9351,
  },
  {
    id: 'DEP-03',
    code: 'KD-TKM',
    name: 'ISI Depot — Ta Khmau',
    province: 'Kandal',
    address: 'National Road 2, Ta Khmau, Kandal',
    salesOrg: 'ISI Pipe',
    lat: 11.4812,
    lng: 104.9463,
  },
  {
    id: 'DEP-04',
    code: 'BB-CITY',
    name: 'ISI Depot — Battambang',
    province: 'Battambang',
    address: 'National Road 5, Battambang City',
    salesOrg: 'ISI Distribution',
    lat: 13.0957,
    lng: 103.2022,
  },
  {
    id: 'DEP-05',
    code: 'SR-CITY',
    name: 'ISI Depot — Siem Reap',
    province: 'Siem Reap',
    address: 'Airport Road, Siem Reap City',
    salesOrg: 'ISI Distribution',
    lat: 13.3571,
    lng: 103.8448,
  },
];

// ── Sales representatives ────────────────────────────────────────────────────

function buildReps(): SalesRep[] {
  const rng = makeRng(20240117);
  const statuses: RepStatus[] = ['Working', 'On Route', 'Working', 'On Route', 'Break', 'Offline'];

  return Array.from({ length: 20 }, (_, i) => {
    const family = FAMILY_NAMES[i % FAMILY_NAMES.length];
    const given = GIVEN_NAMES[(i * 7 + 3) % GIVEN_NAMES.length];
    const name = `${family} ${given}`;
    const status = statuses[i % statuses.length];
    // Most reps work Phnom Penh; the rest cover one province each.
    const province: Province = i < 12 ? 'Phnom Penh' : PROVINCES[1 + ((i - 12) % 4)];
    const center = PROVINCE_CENTERS[province];

    return {
      id: `REP-${padCode(i + 1, 2)}`,
      employeeId: `ISI-${padCode(1040 + i * 3, 4)}`,
      name,
      initials: `${family[0]}${given[0]}`,
      team: TEAMS[i % TEAMS.length],
      salesOrg: SALES_ORGS[i % SALES_ORGS.length],
      division: DIVISIONS[(i * 3) % DIVISIONS.length],
      province,
      phone: `+855 ${rng.int(10, 99)} ${rng.int(100, 999)} ${rng.int(100, 999)}`,
      status,
      online: status !== 'Offline',
      capacity: rng.int(8, 14),
      distanceCovered: Number(rng.float(6, 74).toFixed(1)),
      currentLocation: rng.pick(CURRENT_LOCATIONS),
      shift: rng.pick(SHIFTS),
      avatarHue: (i * 37) % 360,
      rating: Number(rng.float(3.8, 5).toFixed(1)),
      lat: center.lat + rng.spread(0.05),
      lng: center.lng + rng.spread(0.05),
    };
  });
}

export const salesReps: SalesRep[] = buildReps();

// ── Customers ────────────────────────────────────────────────────────────────

function buildCustomers(): Customer[] {
  const rng = makeRng(880123);
  const creditStatuses: CreditStatus[] = [
    'Good Standing', 'Good Standing', 'Good Standing', 'Watchlist', 'On Hold', 'Overdue',
  ];
  // Weighted so the map reads as a Phnom Penh operation with regional coverage.
  const provinceMix: Province[] = [
    ...Array(11).fill('Phnom Penh'),
    ...Array(3).fill('Kandal'),
    'Battambang',
    'Siem Reap',
    'Kampong Speu',
  ];

  const list: Customer[] = [];

  for (let i = 0; i < 200; i += 1) {
    const featured = FEATURED[i];
    const type: CustomerType = featured ? featured.type : rng.pick(CUSTOMER_TYPES);
    const province: Province = featured ? 'Phnom Penh' : provinceMix[i % provinceMix.length];
    const center = PROVINCE_CENTERS[province];
    const district = rng.pick(DISTRICTS[province]);
    const name = featured
      ? featured.name
      : `${rng.pick(BRAND_PREFIX)} ${rng.pick(BRAND_SUFFIX[type])}`;

    const salesOrg: SalesOrg = SALES_ORGS[(i * 5 + 1) % SALES_ORGS.length];
    const division: Division = DIVISIONS[(i * 3 + 2) % DIVISIONS.length];
    const creditLimit = rng.int(4, 60) * 1000;
    const tier = TIER_BY_INDEX[i % 4];
    const daysAgo = rng.int(2, 45);
    const lastVisit = new Date(Date.UTC(2026, 7, 6) - daysAgo * 86400000)
      .toISOString()
      .slice(0, 10);

    list.push({
      id: `CUS-${padCode(i + 1, 3)}`,
      code: `C${padCode(10450 + i * 7, 6)}`,
      name,
      type,
      salesOrg,
      division,
      province,
      district,
      address: `#${rng.int(4, 480)}, ${rng.pick(STREETS)}, ${district}, ${province}`,
      contactPerson: `${rng.pick(FAMILY_NAMES)} ${rng.pick(GIVEN_NAMES)}`,
      phone: `+855 ${rng.int(10, 99)} ${rng.int(100, 999)} ${rng.int(100, 999)}`,
      workingHours: rng.pick(WORKING_HOURS),
      creditStatus: rng.pick(creditStatuses),
      creditLimit,
      outstanding: Math.round(creditLimit * rng.float(0, 0.85)),
      outstandingOrders: rng.chance(0.45) ? rng.int(1, 5) : 0,
      lastVisit,
      totalVisits: rng.int(3, 96),
      lifetimeValue: rng.int(8, 720) * 1000,
      tier,
      notes: rng.pick(VISIT_NOTES),
      lat: featured ? featured.lat : center.lat + rng.spread(province === 'Phnom Penh' ? 0.062 : 0.05),
      lng: featured ? featured.lng : center.lng + rng.spread(province === 'Phnom Penh' ? 0.062 : 0.05),
    });
  }

  return list;
}

export const customers: Customer[] = buildCustomers();

export const customersById: Record<string, Customer> = Object.fromEntries(
  customers.map((c) => [c.id, c])
);

export const depotsById: Record<string, Depot> = Object.fromEntries(
  depots.map((d) => [d.id, d])
);

export const repsById: Record<string, SalesRep> = Object.fromEntries(
  salesReps.map((r) => [r.id, r])
);

// ── Today's stops ────────────────────────────────────────────────────────────

function nearestDepot(customer: Customer): Depot {
  let best = depots[0];
  let bestKm = Infinity;
  for (const d of depots) {
    const km = roadKm(customer, d);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best;
}

function buildStops(): Stop[] {
  const rng = makeRng(551977);
  const priorityMix: Priority[] = [
    'Critical', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Low', 'Low',
  ];

  // The featured landmarks lead the queue so the demo route reads well.
  const pool = [
    ...customers.slice(0, FEATURED.length),
    ...customers.slice(FEATURED.length).filter((_, i) => i % 2 === 0),
  ].slice(0, 100);

  const workingReps = salesReps.filter((r) => r.status !== 'Offline');

  return pool.map((customer, i) => {
    const depot = nearestDepot(customer);
    const priority: Priority = i < 3 ? 'Critical' : rng.pick(priorityMix);

    // ~62% of the day is pre-planned; the rest is what the manager assigns.
    const assigned = i < 62;
    const rep = assigned
      ? workingReps.find((r) => r.province === customer.province) ??
        workingReps[i % workingReps.length]
      : null;

    let status: StopStatus = 'Unassigned';
    if (assigned) {
      if (i < 18) status = 'Completed';
      else if (i < 24) status = 'In Progress';
      else if (i === 58 || i === 59) status = 'Skipped';
      else status = 'Assigned';
    }

    const startMinutes = 480 + (i % 9) * 55 + rng.int(0, 12);
    const h = Math.floor(startMinutes / 60);
    const m = startMinutes % 60;

    const estimatedMinutes = rng.int(25, 60);

    // Realistic planned activities for the sales rep to execute at this stop
    const activities: PlannedActivity[] = [
      {
        id: `ACT-${padCode(i + 1, 3)}-1`,
        type: 'Stock Audit',
        title: 'Inventory Count & Shelf Share',
        description: 'Verify current stock of GI pipes, deformed bars and roofing sheets against minimum threshold.',
        required: true,
        estimatedMinutes: 15,
        status: status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'Completed' : 'Pending',
        completedAt: status === 'Completed' ? `${padCode(h, 2)}:15` : undefined,
      },
      {
        id: `ACT-${padCode(i + 1, 3)}-2`,
        type: 'Order Collection',
        title: 'Restock Requisition & Order Booking',
        description: 'Review weekly replenishment orders, check pending credit limits, and confirm dispatch date.',
        required: true,
        estimatedMinutes: 20,
        status: status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'In Progress' : 'Pending',
        completedAt: status === 'Completed' ? `${padCode(h, 2)}:35` : undefined,
      },
      {
        id: `ACT-${padCode(i + 1, 3)}-3`,
        type: i % 2 === 0 ? 'Merchandising' : 'Competitor Survey',
        title: i % 2 === 0 ? 'POSM Branding & Display Audit' : 'Competitor Price & Promo Check',
        description: i % 2 === 0
          ? 'Check ISI Steel signage, clean product sample racks, replace faded posters.'
          : 'Record retail price of competing brands (V-Steel, Thai Pipe) and note active dealer discounts.',
        required: false,
        estimatedMinutes: 10,
        status: status === 'Completed' ? (i % 3 === 0 ? 'Skipped' : 'Completed') : 'Pending',
        completedAt: status === 'Completed' && i % 3 !== 0 ? `${padCode(h, 2)}:45` : undefined,
      },
      {
        id: `ACT-${padCode(i + 1, 3)}-4`,
        type: customer.outstanding > 0 ? 'Payment Collection' : 'Product Pitch',
        title: customer.outstanding > 0 ? 'Invoice Settlement & Receipt' : 'Introduce New Profile Roofing',
        description: customer.outstanding > 0
          ? `Collect payment for overdue invoice (${customer.outstanding.toLocaleString()} USD outstanding).`
          : 'Present technical spec sheet of new anti-corrosion galvanized sheets to owner.',
        required: customer.outstanding > 5000,
        estimatedMinutes: 15,
        status: status === 'Completed' ? 'Completed' : 'Pending',
        completedAt: status === 'Completed' ? `${padCode(h, 2)}:55` : undefined,
      },
    ];

    let actualStart: string | undefined = undefined;
    let actualEnd: string | undefined = undefined;
    let actualMinutes: number | undefined = undefined;
    let actualDistanceKm: number | undefined = undefined;
    let actualCheckInMethod: 'GPS' | 'Manual' | 'QR' | undefined = undefined;
    let varianceMinutes: number | undefined = undefined;
    let complianceStatus: 'On Time' | 'Delayed' | 'Missed' | 'Unplanned' | undefined = undefined;
    let skipReason: string | undefined = undefined;

    if (status === 'Completed') {
      const variance = rng.int(-8, 22);
      varianceMinutes = variance;
      const actStartMin = Math.max(480, startMinutes + variance);
      actualStart = `${padCode(Math.floor(actStartMin / 60), 2)}:${padCode(actStartMin % 60, 2)}`;
      actualMinutes = estimatedMinutes + rng.int(-5, 12);
      const actEndMin = actStartMin + actualMinutes;
      actualEnd = `${padCode(Math.floor(actEndMin / 60), 2)}:${padCode(actEndMin % 60, 2)}`;
      actualDistanceKm = Number((roadKm(depot, customer) * rng.float(0.98, 1.15)).toFixed(1));
      actualCheckInMethod = rng.chance(0.88) ? 'GPS' : 'Manual';
      complianceStatus = variance <= 15 ? 'On Time' : 'Delayed';
    } else if (status === 'In Progress') {
      const variance = rng.int(-5, 10);
      varianceMinutes = variance;
      const actStartMin = Math.max(480, startMinutes + variance);
      actualStart = `${padCode(Math.floor(actStartMin / 60), 2)}:${padCode(actStartMin % 60, 2)}`;
      actualDistanceKm = Number((roadKm(depot, customer) * rng.float(1.0, 1.08)).toFixed(1));
      actualCheckInMethod = 'GPS';
      complianceStatus = 'On Time';
    } else if (status === 'Skipped') {
      complianceStatus = 'Missed';
      skipReason = rng.pick([
        'Depot closed for Buddhist holiday',
        'Owner / Purchasing decision maker unavailable',
        'Heavy rain flooded site access road',
        'Client already placed weekly order over phone',
        'Emergency route reassignment by sales manager',
      ]);
    }

    return {
      id: `STP-${padCode(i + 1, 3)}`,
      seq: (i % 9) + 1,
      customerId: customer.id,
      depotId: depot.id,
      repId: rep ? rep.id : null,
      priority,
      status,
      plannedStart: `${padCode(h, 2)}:${padCode(m, 2)}`,
      estimatedMinutes,
      distanceKm: Number(roadKm(depot, customer).toFixed(1)),
      visitReason: rng.pick(VISIT_REASONS),
      notes: customer.notes,
      orderValue: rng.chance(0.7) ? rng.int(400, 18000) : 0,
      photos: rng.int(0, 4),
      activities,
      actualStart,
      actualEnd,
      actualMinutes,
      actualDistanceKm,
      actualCheckInMethod,
      varianceMinutes,
      complianceStatus,
      skipReason,
      scheduledDate: '2026-08-06',
    };
  });
}

export const stops: Stop[] = buildStops();

// ── Call Plans ─────────────────────────────────────────────────────────────

function buildCallPlans(): CallPlanItem[] {
  const objectives = [
    'Monthly stock replenishment & credit review',
    'Quarterly dealer rebate negotiation',
    'Introduce new corrugated roofing profile',
    'Collect overdue payment and take restocking order',
    'Audit showroom branding & deliver promotional POSM',
    'Construction contractor project site visit',
    'Annual price agreement renewal',
  ];

  const pool = customers.slice(0, 36);
  const activeReps = salesReps.filter((r) => r.status !== 'Offline');

  return pool.map((customer, i) => {
    const rep = activeReps.find((r) => r.province === customer.province) ?? activeReps[i % activeReps.length];
    const hour = 8 + (i % 6) * 1.5;
    const h1 = Math.floor(hour);
    const m1 = hour % 1 === 0 ? '00' : '30';
    const h2 = Math.floor(hour + 1);
    const m2 = hour % 1 === 0 ? '30' : '45';

    const dayOffset = (i % 5);
    const planDate = new Date(Date.UTC(2026, 7, 3 + dayOffset)).toISOString().slice(0, 10);

    return {
      id: `CP-2026-${padCode(i + 1, 4)}`,
      callPlanNo: `CP-${padCode(i + 101, 4)}`,
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      province: customer.province,
      repId: rep.id,
      repName: rep.name,
      plannedDate: planDate,
      timeSlot: `${padCode(h1, 2)}:${m1} - ${padCode(h2, 2)}:${m2}`,
      priority: i < 5 ? 'Critical' : i < 15 ? 'High' : 'Medium',
      objective: objectives[i % objectives.length],
      activities: ['Stock Audit', 'Order Collection', i % 2 === 0 ? 'Merchandising' : 'Product Pitch'],
      status: i < 28 ? 'Committed' : 'Ready',
      importedAt: '2026-08-01 09:30',
      sourceFile: 'ISI_Sales_Call_Plan_Aug2026_v2.xlsx',
    };
  });
}

export const callPlans: CallPlanItem[] = buildCallPlans();

export const initialImportBatches: CallPlanImportBatch[] = [
  {
    id: 'BATCH-001',
    fileName: 'ISI_Sales_Call_Plan_Aug2026_v2.xlsx',
    importedAt: '2026-08-01 09:30',
    importedBy: 'Keo Sopheap (Sales Admin)',
    totalRows: 36,
    validRows: 36,
    committedRows: 28,
    status: 'Committed',
  },
  {
    id: 'BATCH-002',
    fileName: 'Kandal_Province_Depot_Calls_W32.csv',
    importedAt: '2026-08-04 14:15',
    importedBy: 'Vibol Rith (Territory Manager)',
    totalRows: 18,
    validRows: 18,
    committedRows: 18,
    status: 'Committed',
  },
];

// ── Weekly Schedules ────────────────────────────────────────────────────────

export function buildWeeklySchedules(): RepWeeklySchedule[] {
  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08'];

  return salesReps.map((rep, idx) => {
    const rng = makeRng(1003 + idx * 79);
    const daySchedules = days.map((day, dIdx) => {
      const isRest = day === 'Sat' && idx % 2 === 1;
      const stopCount = isRest ? 0 : rng.int(5, 9);
      const hours = isRest ? 0 : Number((stopCount * 0.95 + rng.float(0.5, 1.2)).toFixed(1));
      const targetValue = isRest ? 0 : stopCount * rng.int(800, 2200);
      const isPast = dIdx < 3; // Mon-Wed are past/completed
      return {
        day,
        date: dates[dIdx],
        stopCount,
        hours,
        targetValue,
        status: (isRest ? 'Rest' : isPast ? 'Completed' : 'Scheduled') as 'Scheduled' | 'Completed' | 'Rest',
      };
    });

    const totalStops = daySchedules.reduce((acc, d) => acc + d.stopCount, 0);
    const totalHours = Number(daySchedules.reduce((acc, d) => acc + d.hours, 0).toFixed(1));
    const totalTargetValue = daySchedules.reduce((acc, d) => acc + d.targetValue, 0);

    return {
      repId: rep.id,
      repName: rep.name,
      weekRange: '03 Aug – 08 Aug 2026 (Week 32)',
      days: daySchedules,
      totalStops,
      totalHours,
      totalTargetValue,
    };
  });
}

export const repWeeklySchedules: RepWeeklySchedule[] = buildWeeklySchedules();

// ── Per-customer history (rendered lazily in the detail drawer) ──────────────

const HISTORY_TEMPLATES: Array<{ label: string; detail: string; kind: HistoryEvent['kind'] }> = [
  { label: 'Visit completed', detail: 'Stock check and shelf audit · 42 min on site', kind: 'visit' },
  { label: 'Order placed', detail: 'Deformed bar D12 · 6 tonnes', kind: 'order' },
  { label: 'Payment received', detail: 'Invoice settled in full', kind: 'payment' },
  { label: 'Visit completed', detail: 'Price list handover · 28 min on site', kind: 'visit' },
  { label: 'Note added', detail: 'Owner asked for roofing sheet samples', kind: 'note' },
  { label: 'Order placed', detail: 'Zinc roofing sheet · 240 pcs', kind: 'order' },
  { label: 'Visit completed', detail: 'Credit review with purchasing officer', kind: 'visit' },
];

export function historyFor(customerId: string): HistoryEvent[] {
  const seed = customerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 31;
  const rng = makeRng(seed);
  return Array.from({ length: 6 }, (_, i) => {
    const template = HISTORY_TEMPLATES[(i + rng.int(0, 6)) % HISTORY_TEMPLATES.length];
    const date = new Date(Date.UTC(2026, 7, 6) - (i * 9 + rng.int(1, 6)) * 86400000);
    return {
      id: `${customerId}-EV-${i}`,
      date: date.toISOString().slice(0, 10),
      label: template.label,
      detail: template.detail,
      kind: template.kind,
    };
  });
}

/** Distinct district list for the filter bar, keyed by province. */
export const districtsByProvince: Record<string, string[]> = DISTRICTS;
export const allDistricts: string[] = Array.from(
  new Set(Object.values(DISTRICTS).flat())
).sort();
