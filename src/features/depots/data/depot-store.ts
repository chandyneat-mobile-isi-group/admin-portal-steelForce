import { DEPOT_APPROVAL_DATABASE } from '@/features/approvals/depot-approval-data';
import { requiredApproval } from '@/features/approvals/credit-approval';
import { salesReps } from '@/features/planning/data/demo-data';
import { createPersistentStore } from '@/services/mock';
import { makeRng } from '@/lib/utilities/random';
import { crmDepots, MY_REP_IDS, type CrmDepot } from './crm';
import type { Depot, DepotLifecycle, DepotSapState } from '../repositories/types';

/**
 * The depot master for the static prototype — one persisted collection.
 *
 * Every screen that shows a depot reads this store: the depot directory, My Depots,
 * the approval queue and the decision page. Approving a registration on one screen is
 * therefore visible on all of them, exactly as it would be against one database.
 *
 * Two kinds of record live here:
 * - the 200 trading accounts from the CRM demo master, decorated with a lifecycle and
 *   an SAP state; and
 * - field registrations still walking the approval chain, built from the approval
 *   demo records (`REQ-D-…`) so the decision page shows their full detail.
 */

const PROVINCE_POSTAL: Record<string, string> = {
  'Phnom Penh': '120',
  Kandal: '081',
  Battambang: '021',
  'Siem Reap': '172',
  'Kampong Speu': '051',
  Takeo: '211',
  'Kampong Cham': '031',
  Kep: '231',
  Pursat: '151',
  Kampot: '071',
};

/** Payment terms as days; cash on delivery sits in the 7-day policy column. */
export function termDaysFrom(paymentTerms: string | undefined): number | null {
  if (!paymentTerms) return null;
  if (/cash/i.test(paymentTerms)) return 7;
  const match = paymentTerms.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/** The CRM reading of a lifecycle state, for the commercial screens. */
export function crmStatusFor(lifecycle: DepotLifecycle, current?: Depot['status']): Depot['status'] {
  switch (lifecycle) {
    case 'Active':
      // Keep a CRM judgement ("Needs Follow-up") that is still true of a trading account.
      return current && current !== 'Prospect' && current !== 'Inactive' ? current : 'Active';
    case 'Suspended':
      return 'At Risk';
    case 'Closed':
    case 'Rejected':
      return 'Inactive';
    default:
      return 'Prospect';
  }
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sapState(partial: Partial<DepotSapState>): DepotSapState {
  return {
    status: 'NotSubmitted',
    customerNumber: null,
    submittedAt: null,
    registeredAt: null,
    lastError: null,
    attemptCount: 0,
    lastPulledAt: null,
    ...partial,
  };
}

/** ISO timestamp for a date-only demo value, at a plausible office hour. */
function stamp(date: string, hour = 9): string {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

/** Field registrations in the master were all submitted in the four weeks to 20 Sep 2026. */
const REGISTRATION_WINDOW_END = Date.UTC(2026, 8, 20, 9, 0);

function fromCrm(
  crm: CrmDepot,
  index: number,
  rng: ReturnType<typeof makeRng>,
  queued: { count: number }
): Depot {
  let lifecycle: DepotLifecycle;
  if (crm.status === 'Inactive') lifecycle = 'Closed';
  else if (crm.status === 'At Risk') lifecycle = index % 3 === 0 ? 'Suspended' : 'Active';
  else if (crm.status === 'Prospect') {
    lifecycle = rng.weighted<DepotLifecycle>([
      ['PendingApproval', 6],
      ['RegionManagerApproved', 2],
      ['SalesManagerApproved', 1],
      ['Draft', 2],
      ['Rejected', 1],
    ]);
  } else lifecycle = 'Active';

  const trading = lifecycle === 'Active' || lifecycle === 'Suspended' || lifecycle === 'Closed';
  const creditTermDays = termDaysFrom(crm.paymentTerms);
  // A registration is recent by definition; the master's own dates are years old.
  const registeredOn = trading
    ? crm.createdAt
    : new Date(REGISTRATION_WINDOW_END - rng.int(0, 28) * 86_400_000).toISOString().slice(0, 10);
  const submittedAt = lifecycle === 'Draft' || trading ? null : stamp(registeredOn, 8 + (index % 8));
  const required = requiredApproval(crm.creditLimit, creditTermDays);
  const awaitingNsc = required.kind === 'level' && required.level === 4;

  let sap: DepotSapState;
  if (trading) {
    sap = sapState({
      status: 'Registered',
      customerNumber: crm.code,
      submittedAt: stamp(crm.createdAt, 10),
      registeredAt: stamp(crm.createdAt, 15),
      attemptCount: 1,
    });
  } else if (
    lifecycle === 'SalesManagerApproved' ||
    (lifecycle === 'RegionManagerApproved' && !awaitingNsc)
  ) {
    // Signed off and queued for SAP; a few came back refused, as real pushes do.
    queued.count += 1;
    const refused = queued.count % 3 === 0;
    sap = sapState({
      status: refused ? 'Rejected' : 'Pending',
      submittedAt: stamp(registeredOn, 16),
      attemptCount: refused ? 1 : 0,
      lastError: refused ? 'SAP refused the partner: tax number (VAT TIN) is missing on the sales area.' : null,
    });
  } else {
    sap = sapState({});
  }

  const slug = slugOf(crm.name);
  return {
    ...crm,
    createdAt: registeredOn,
    status: crmStatusFor(lifecycle, crm.status),
    lifecycle,
    registrationType: 'Depot (BP)',
    telegram: `@${slug.slice(0, 20)}`,
    sapId: sap.customerNumber ?? '',
    canTrade: lifecycle === 'Active',
    latitude: crm.lat,
    longitude: crm.lng,
    addressLine1: crm.address.split(',').slice(0, 2).join(',').trim(),
    addressLine2: '',
    postalCode: `${PROVINCE_POSTAL[crm.province] ?? '120'}${String(10 + (index % 80)).padStart(2, '0')}`,
    creditTermDays,
    previousCode: null,
    submittedAt,
    approvedAt: trading ? stamp(crm.createdAt, 14) : null,
    rejectedAt: lifecycle === 'Rejected' ? stamp(registeredOn, 17) : null,
    rejectionReason:
      lifecycle === 'Rejected'
        ? 'Shopfront photograph does not show the signboard — please recapture in daylight.'
        : null,
    suspendedAt: lifecycle === 'Suspended' ? stamp(crm.nextFollowUp ?? crm.createdAt, 11) : null,
    suspensionReason: lifecycle === 'Suspended' ? 'Overdue balance beyond 60 days.' : null,
    contacts: [
      { id: `${crm.id}-c1`, name: crm.contactPerson, role: 'Owner', phone: crm.phone, email: crm.email, isPrimary: true },
    ],
    sap,
  };
}

const APPROVAL_STATUS: Record<string, DepotLifecycle> = {
  'REQ-D-8821': 'PendingApproval',
  'REQ-D-8820': 'RegionManagerApproved',
  'REQ-D-8819': 'RegionManagerApproved',
  'REQ-D-8818': 'Active',
};

/** The four fully documented registrations from the approval demo records. */
function fromApprovalDatabase(): Depot[] {
  return Object.values(DEPOT_APPROVAL_DATABASE).map((d, i) => {
    const lifecycle = APPROVAL_STATUS[d.id] ?? 'PendingApproval';
    const province = d.address.province.replace(/ (Province|Capital)$/, '');
    const submittedAt = d.submittedDate.toISOString();
    const limit = d.proposedCreditLimit ?? d.creditLimit;
    const required = requiredApproval(limit, d.creditTermDays);
    const awaitingNsc = required.kind === 'level' && required.level === 4;
    const active = lifecycle === 'Active';
    const sap = active
      ? sapState({
          status: 'Registered',
          customerNumber: d.sapBpNumber.replace(/\D/g, ''),
          submittedAt,
          registeredAt: new Date(d.submittedDate.getTime() + 26 * 3600_000).toISOString(),
          attemptCount: 1,
        })
      : lifecycle === 'RegionManagerApproved' && !awaitingNsc
        ? sapState({ status: 'Pending', submittedAt: new Date(d.submittedDate.getTime() + 5 * 3600_000).toISOString() })
        : sapState({});

    return {
      id: d.id,
      code: active ? sap.customerNumber! : d.code,
      previousCode: active ? d.code : d.previousCode ?? null,
      name: d.name,
      khmerName: d.khmerName,
      type: 'Depot',
      registrationType: d.type,
      salesOrg: 'ISI Steel',
      division: 'Retail',
      province,
      district: d.address.district,
      address: d.address.formatted,
      addressLine1: `${d.address.houseNo}, ${d.address.street}`,
      addressLine2: `${d.address.village}, ${d.address.commune}`,
      postalCode: d.address.postalCode,
      lat: d.address.latitude,
      lng: d.address.longitude,
      latitude: d.address.latitude,
      longitude: d.address.longitude,
      contactPerson: d.primaryContact.name,
      phone: d.primaryContact.phone,
      email: d.primaryContact.email,
      telegram: d.primaryContact.telegram,
      website: d.primaryContact.website ?? '',
      workingHours: d.operatingHours,
      creditStatus: 'Good Standing',
      creditLimit: limit,
      creditTermDays: d.creditTermDays,
      paymentTerms: `Net ${d.creditTermDays}`,
      outstanding: 0,
      outstandingOrders: 0,
      lastVisit: null,
      totalVisits: 1,
      lifetimeValue: 0,
      tier: d.tier === 'Standard' ? 'Bronze' : d.tier,
      notes: d.siteAccessNotes.deliveryGateRemarks,
      status: crmStatusFor(lifecycle),
      lifecycle,
      industry: d.industry,
      category: d.category,
      segment: d.segment,
      registrationNo: d.registrationNo,
      salesValue: 0,
      monthlyRevenue: d.projectedMonthlyRevenue,
      nextFollowUp: null,
      repId: MY_REP_IDS[i % MY_REP_IDS.length],
      createdAt: submittedAt.slice(0, 10),
      openOpportunities: 0,
      sapId: sap.customerNumber ?? '',
      canTrade: active,
      submittedAt,
      approvedAt: active ? new Date(d.submittedDate.getTime() + 24 * 3600_000).toISOString() : null,
      rejectedAt: null,
      rejectionReason: null,
      contacts: d.contacts.map((c) => ({
        id: `${d.id}-${c.id}`,
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
        isPrimary: c.isPrimary,
      })),
      sap,
    } satisfies Depot;
  });
}

interface RegistrationSeed {
  id: string;
  name: string;
  khmerName: string;
  registrationType: 'Depot (BP)' | 'Non-BP Depot';
  province: string;
  district: string;
  street: string;
  lat: number;
  lng: number;
  contact: string;
  phone: string;
  submitted: string | null;
  lifecycle: DepotLifecycle;
  creditLimit: number;
  termDays: number;
  rejectionReason?: string;
}

/** Fresh field registrations with no fixture behind them — the bulk of a real queue. */
const REGISTRATIONS: RegistrationSeed[] = [
  { id: 'REQ-D-8822', name: 'Angkor Roofing Corner', khmerName: 'អង្គរ ដំបូល', registrationType: 'Non-BP Depot', province: 'Siem Reap', district: 'Puok', street: 'National Road 6', lat: 13.4021, lng: 103.7712, contact: 'Mr. Dara Sok', phone: '+855 12 774 310', submitted: '2026-09-18T08:40:00.000Z', lifecycle: 'PendingApproval', creditLimit: 3000, termDays: 7 },
  { id: 'REQ-D-8823', name: 'Takeo Hardware House', khmerName: 'តាកែវ គ្រឿងដែក', registrationType: 'Depot (BP)', province: 'Takeo', district: 'Doun Kaev', street: 'National Road 2', lat: 10.9908, lng: 104.7849, contact: 'Mrs. Sreymom Chea', phone: '+855 17 552 904', submitted: '2026-09-18T10:05:00.000Z', lifecycle: 'PendingApproval', creditLimit: 8000, termDays: 7 },
  { id: 'REQ-D-8824', name: 'Mekong Steel Trading', khmerName: 'មេគង្គ ដែកថែប', registrationType: 'Depot (BP)', province: 'Kampong Cham', district: 'Kampong Cham City', street: 'Preah Monivong Blvd', lat: 11.9934, lng: 105.4635, contact: 'Mr. Kosal Pen', phone: '+855 92 331 187', submitted: '2026-09-18T13:30:00.000Z', lifecycle: 'PendingApproval', creditLimit: 150000, termDays: 15 },
  { id: 'REQ-D-8817', name: 'Kep Builders Supply', khmerName: 'កែប សម្ភារៈសំណង់', registrationType: 'Non-BP Depot', province: 'Kep', district: 'Kep City', street: 'National Road 33A', lat: 10.4829, lng: 104.3168, contact: 'Ms. Mony Tep', phone: '+855 88 610 425', submitted: '2026-09-15T16:00:00.000Z', lifecycle: 'Rejected', creditLimit: 5000, termDays: 30, rejectionReason: 'Patent tax certificate is for a different business name. Upload the certificate issued to Kep Builders Supply.' },
  { id: 'REQ-D-8825', name: 'Pursat Iron Point', khmerName: 'ពោធិ៍សាត់ ដែក', registrationType: 'Non-BP Depot', province: 'Pursat', district: 'Pursat City', street: 'National Road 5', lat: 12.5388, lng: 103.9192, contact: 'Mr. Sophal Meas', phone: '+855 16 908 552', submitted: null, lifecycle: 'Draft', creditLimit: 4000, termDays: 15 },
  { id: 'REQ-D-8826', name: 'Kampot Pepper Road Hardware', khmerName: 'កំពត គ្រឿងដែក', registrationType: 'Depot (BP)', province: 'Kampot', district: 'Kampot City', street: 'Street 724', lat: 10.6104, lng: 104.1810, contact: 'Mr. Vuthy Lim', phone: '+855 97 210 664', submitted: '2026-09-19T09:15:00.000Z', lifecycle: 'PendingApproval', creditLimit: 18000, termDays: 30 },
  { id: 'REQ-D-8827', name: 'Battambang Rice-Belt Steel', khmerName: 'បាត់ដំបង ដែក', registrationType: 'Depot (BP)', province: 'Battambang', district: 'Sangkae', street: 'National Road 5', lat: 13.1172, lng: 103.2290, contact: 'Mrs. Chanthy Ouk', phone: '+855 12 640 118', submitted: '2026-09-19T11:40:00.000Z', lifecycle: 'PendingApproval', creditLimit: 45000, termDays: 45 },
  { id: 'REQ-D-8828', name: 'Ta Khmau Roofing Depot', khmerName: 'តាខ្មៅ ដំបូល', registrationType: 'Depot (BP)', province: 'Kandal', district: 'Ta Khmau', street: 'National Road 2', lat: 11.4833, lng: 104.9455, contact: 'Mr. Piseth Hun', phone: '+855 89 455 270', submitted: '2026-09-16T14:20:00.000Z', lifecycle: 'SalesManagerApproved', creditLimit: 60000, termDays: 60 },
  { id: 'REQ-D-8829', name: 'Sen Sok Construction Mart', khmerName: 'សែនសុខ ផ្សារសំណង់', registrationType: 'Depot (BP)', province: 'Phnom Penh', district: 'Sen Sok', street: 'Hanoi Blvd (St. 1019)', lat: 11.5927, lng: 104.8789, contact: 'Mr. Ratha Kim', phone: '+855 10 818 202', submitted: '2026-09-20T08:05:00.000Z', lifecycle: 'PendingApproval', creditLimit: 2500, termDays: 7 },
  { id: 'REQ-D-8830', name: 'Chbar Mon Pipe & Fittings', khmerName: 'ច្បារមន បំពង់', registrationType: 'Non-BP Depot', province: 'Kampong Speu', district: 'Chbar Mon', street: 'National Road 4', lat: 11.4597, lng: 104.5289, contact: 'Ms. Leakhena Sam', phone: '+855 15 377 640', submitted: '2026-09-20T10:30:00.000Z', lifecycle: 'PendingApproval', creditLimit: 12000, termDays: 120 },
];

function fromRegistration(seed: RegistrationSeed, i: number): Depot {
  const lifecycle = seed.lifecycle;
  const sap =
    lifecycle === 'SalesManagerApproved'
      ? sapState({ status: 'Pending', submittedAt: seed.submitted })
      : sapState({});
  const slug = slugOf(seed.name);
  return {
    id: seed.id,
    code: `BP-202609-${seed.id.slice(-4)}`,
    previousCode: null,
    name: seed.name,
    khmerName: seed.khmerName,
    type: seed.registrationType === 'Non-BP Depot' ? 'Hardware Shop' : 'Depot',
    registrationType: seed.registrationType,
    salesOrg: 'ISI Distribution',
    division: 'Retail',
    province: seed.province,
    district: seed.district,
    address: `${seed.street}, ${seed.district}, ${seed.province}`,
    addressLine1: seed.street,
    addressLine2: '',
    postalCode: `${PROVINCE_POSTAL[seed.province] ?? '120'}${String(20 + i).padStart(2, '0')}`,
    lat: seed.lat,
    lng: seed.lng,
    latitude: seed.lat,
    longitude: seed.lng,
    contactPerson: seed.contact,
    phone: seed.phone,
    email: `${slug.slice(0, 16)}@gmail.com`,
    telegram: `@${slug.slice(0, 20)}`,
    website: '',
    workingHours: '07:00 - 17:30',
    creditStatus: 'Good Standing',
    creditLimit: seed.creditLimit,
    creditTermDays: seed.termDays,
    paymentTerms: seed.termDays <= 7 ? 'Cash on delivery' : `Net ${seed.termDays}`,
    outstanding: 0,
    outstandingOrders: 0,
    lastVisit: null,
    totalVisits: 1,
    lifetimeValue: 0,
    tier: 'Bronze',
    notes: 'Registered from the field by the territory representative.',
    status: crmStatusFor(lifecycle),
    lifecycle,
    industry: 'Building Materials Retail',
    category: 'Growth',
    segment: 'Small business',
    registrationNo: `MoC-${String(51000 + i * 137).padStart(8, '0')}/2026`,
    salesValue: 0,
    monthlyRevenue: Math.round(seed.creditLimit * 0.6),
    nextFollowUp: null,
    repId: MY_REP_IDS[(i + 2) % MY_REP_IDS.length] ?? salesReps[0].id,
    createdAt: (seed.submitted ?? '2026-09-21T09:00:00.000Z').slice(0, 10),
    openOpportunities: 0,
    sapId: '',
    canTrade: false,
    submittedAt: seed.submitted,
    approvedAt: null,
    rejectedAt: lifecycle === 'Rejected' ? '2026-09-16T09:30:00.000Z' : null,
    rejectionReason: seed.rejectionReason ?? null,
    contacts: [
      { id: `${seed.id}-c1`, name: seed.contact, role: 'Owner', phone: seed.phone, isPrimary: true },
    ],
    sap,
  };
}

function seedDepots(): Depot[] {
  const rng = makeRng(51207);
  const queued = { count: 0 };
  return [
    ...fromApprovalDatabase(),
    ...REGISTRATIONS.map(fromRegistration),
    ...crmDepots.map((crm, i) => fromCrm(crm, i, rng, queued)),
  ];
}

export const depotStore = createPersistentStore<Depot[]>('depots', seedDepots);

/** SAP sync bookkeeping that belongs to the master as a whole, not to one depot. */
export const depotSapMetaStore = createPersistentStore<{
  lastPulledAt: string | null;
  lastReferencesAt: string | null;
}>('depots.sap-meta', () => ({ lastPulledAt: null, lastReferencesAt: null }));

/** Synchronous lookup for screens that already hold an id. */
export function findDepot(id: string): Depot | undefined {
  return depotStore.get().find((depot) => depot.id === id);
}
