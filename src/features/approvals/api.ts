/**
 * The approval hub's service boundary.
 *
 * Three queues live in three different modules, and this is the only place that knows
 * all three. It owns no data of its own — it reads the same stores the individual
 * screens do (the depot master, the quotation book), so a count here can never
 * disagree with the list it links to, and a decision taken here shows everywhere.
 *
 * ## What counts as "needs approval" in each module
 *
 * The three are genuinely different shapes of work, and flattening them into one list
 * would lose what a reviewer needs to know:
 *
 * - **Quotations** — a single gate. One person approves, returns or rejects.
 * - **Depots** — a registration awaiting credit authority, with documents that may be
 *   incomplete. Approving commits the business to a credit limit.
 * - **Promotions** — a *four-signature chain*, so "needs approval" is not one state but
 *   four, and which of them is yours depends on the permissions you hold.
 */
import { z } from 'zod';
import {
  AWAITING_DECISION,
  QUOTATION_STATUS_LABEL,
  depotDocuments,
  depotStore,
  depotsRepository,
  documentSummary,
  quotationTotals,
  quotationsService,
  repById,
  type Depot,
  type DepotDocument,
  type Quotation,
  type QuotationListQuery,
} from '@/features/depots';
import { mockResolve } from '@/services/mock';

export const PendingQuotationSchema = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  status: z.number().or(z.string()),
  statusDisplay: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  net: z.number().nullable().optional(),
  lineCount: z.number().default(0),
  validTo: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export const PendingDepotSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  name: z.string(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  documentCount: z.number().default(0),
  documentsComplete: z.boolean().default(false),
  missingRequiredDocuments: z.array(z.string()).default([]),
});

export type PendingQuotationDto = z.infer<typeof PendingQuotationSchema>;
export type PendingDepotDto = z.infer<typeof PendingDepotSchema>;

/**
 * One depot registration, in full, for the approval decision.
 *
 * ## Why this is the customer endpoint and not a bespoke one
 *
 * `GET /admin/depots/pending-approval` answers "who is waiting" and carries only what a
 * queue row shows. The decision needs the whole record — address, documents, the SAP
 * block — and `GET /customers/{id}` already returns exactly that. A second endpoint
 * would be a second thing to keep in step with the first.
 *
 * ## Every field here is one the backend actually sends
 *
 * The screen this feeds used to read a hardcoded fixture, which invented `industry`,
 * `segment`, `tier`, `creditScore`, projected revenue, operating hours and a dozen more.
 * None of those exist in the platform. They are absent from this schema deliberately, so
 * that the page cannot render a number nobody entered — an approver committing the
 * business to a credit limit has to be looking at facts.
 */
export const DepotDocumentSchema = z.object({
  id: z.string(),
  type: z.string().nullable().optional(),
  typeDisplay: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  url: z.string().nullable().optional(),
  publicUrl: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
});

export const DepotContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const DepotAddressSchema = z.object({
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  houseNo: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const DepotSapSchema = z.object({
  sapCustomerId: z.string().nullable().optional(),
  salesOrg: z.string().nullable().optional(),
  distributionChannel: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  customerGroup: z.string().nullable().optional(),
  priceGroup: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  salesOffice: z.string().nullable().optional(),
  salesGroup: z.string().nullable().optional(),
  shippingCondition: z.string().nullable().optional(),
  creditControlArea: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  isLinkedToSap: z.boolean().nullable().optional(),
  hasCompleteSalesArea: z.boolean().nullable().optional(),
  isBlockedInSap: z.boolean().nullable().optional(),
});

export const DepotSapRegistrationSchema = z.object({
  status: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  registeredAt: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  attemptCount: z.number().nullable().optional(),
  isReadyToRegister: z.boolean().nullable().optional(),
});

export const DepotBusinessPartnerSchema = z.object({
  bpRole: z.string().nullable().optional(),
  accountGroup: z.string().nullable().optional(),
  partnerCategory: z.string().nullable().optional(),
  partnerGroup: z.string().nullable().optional(),
  partnerFunction: z.string().nullable().optional(),
  personnelNumber: z.string().nullable().optional(),
  searchTerm1: z.string().nullable().optional(),
  searchTerm2: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  mobilePhone: z.string().nullable().optional(),
  taxCountry: z.string().nullable().optional(),
  taxType: z.string().nullable().optional(),
  taxClass: z.string().nullable().optional(),
  isReadyForSapCreate: z.boolean().nullable().optional(),
});

export const DepotDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  previousCode: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string(),
  canTrade: z.boolean().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
  creditTermDays: z.number().nullable().optional(),
  creditLimitDate: z.string().nullable().optional(),
  assignedSalesRepId: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  documentsComplete: z.boolean().nullable().optional(),
  missingRequiredDocuments: z.array(z.string()).default([]),
  address: DepotAddressSchema.nullable().optional(),
  contacts: z.array(DepotContactSchema).default([]),
  documents: z.array(DepotDocumentSchema).default([]),
  sap: DepotSapSchema.nullable().optional(),
  sapRegistration: DepotSapRegistrationSchema.nullable().optional(),
  businessPartner: DepotBusinessPartnerSchema.nullable().optional(),
});

export type DepotDetailDto = z.infer<typeof DepotDetailSchema>;
export type DepotDocumentDto = z.infer<typeof DepotDocumentSchema>;
export type DepotContactDto = z.infer<typeof DepotContactSchema>;

// ── Building the wire shapes from the stores ─────────────────────────────────

const REGION: Record<string, string> = {
  'Phnom Penh': 'Capital',
  Kandal: 'Central',
  'Kampong Speu': 'Central',
  Takeo: 'South',
  Kampot: 'South',
  Kep: 'South',
  Battambang: 'North-West',
  'Siem Reap': 'North-West',
  Pursat: 'North-West',
  'Kampong Cham': 'East',
};

const SAP_STATUS_LABEL: Record<string, string> = {
  NotSubmitted: 'Not submitted',
  Pending: 'Queued for SAP',
  Registered: 'Registered',
  Rejected: 'Refused by SAP',
};

/** A local reference the decision page hands back to fetch a document's bytes. */
function documentUrl(depotId: string, doc: DepotDocument): string {
  return `local-document://${depotId}/${doc.id}`;
}

function toDepotDetail(depot: Depot): DepotDetailDto {
  const docs = documentSummary(depot);
  const rep = repById(depot.repId);
  const sapNumber = depot.sap?.customerNumber ?? null;
  const term = depot.creditTermDays ?? null;
  const houseNo = depot.addressLine1?.match(/^#[^,]+/)?.[0] ?? null;

  return DepotDetailSchema.parse({
    id: depot.id,
    code: depot.code,
    previousCode: depot.previousCode ?? null,
    name: depot.name,
    description: depot.notes || null,
    type: depot.registrationType ?? 'Depot (BP)',
    status: depot.lifecycle ?? 'Active',
    canTrade: depot.lifecycle === 'Active',
    phone: depot.phone || null,
    email: depot.email || null,
    contactPerson: depot.contactPerson || null,
    telegramUsername: depot.telegram || null,
    creditLimit: depot.creditLimit || null,
    creditTermDays: term,
    creditLimitDate: depot.approvedAt ?? depot.submittedAt ?? null,
    assignedSalesRepId: depot.repId || null,
    createdAt: depot.submittedAt ?? (depot.createdAt ? `${depot.createdAt}T09:00:00.000Z` : null),
    approvedAt: depot.lifecycle === 'Active' ? depot.approvedAt ?? null : null,
    documentsComplete: docs.isComplete,
    missingRequiredDocuments: docs.missingRequired,
    address: {
      houseNo,
      line1: houseNo ? depot.addressLine1?.slice(houseNo.length).replace(/^,\s*/, '') : depot.addressLine1 || depot.address,
      line2: depot.addressLine2 || null,
      city: depot.district || null,
      district: depot.district || null,
      province: depot.province || null,
      postalCode: depot.postalCode || null,
      country: 'Cambodia',
      region: REGION[depot.province] ?? null,
      latitude: depot.latitude ?? (depot.lat || null),
      longitude: depot.longitude ?? (depot.lng || null),
    },
    contacts: (depot.contacts ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      phone: c.phone,
      email: c.email ?? null,
      isPrimary: c.isPrimary ?? false,
    })),
    documents: docs.documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      typeDisplay: doc.typeDisplay,
      fileName: doc.fileName,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      url: documentUrl(depot.id, doc),
      uploadedAt: doc.uploadedAt,
    })),
    sap: {
      sapCustomerId: sapNumber,
      salesOrg: depot.salesOrg || null,
      distributionChannel: 'Depot network (10)',
      division: depot.division || null,
      customerGroup: depot.registrationType === 'Non-BP Depot' ? 'Z2 · Converted prospect' : 'Z1 · Depot',
      priceGroup: depot.tier ? `${depot.tier} price list` : null,
      paymentTerms: term ? (term <= 7 ? 'C000 · Cash' : `N0${term} · Net ${term}`) : null,
      salesOffice: depot.province ? `${depot.province} office` : null,
      salesGroup: rep?.team ?? null,
      taxNumber: depot.registrationNo ? `K00${depot.registrationNo.replace(/\D/g, '').slice(0, 9).padEnd(9, '0')}` : null,
      isLinkedToSap: Boolean(sapNumber),
      hasCompleteSalesArea: Boolean(depot.salesOrg && depot.division),
      isBlockedInSap: depot.lifecycle === 'Suspended',
    },
    sapRegistration: {
      status: SAP_STATUS_LABEL[depot.sap?.status ?? 'NotSubmitted'],
      submittedAt: depot.sap?.submittedAt ?? null,
      registeredAt: depot.sap?.registeredAt ?? null,
      lastError: depot.sap?.lastError ?? null,
      attemptCount: depot.sap?.attemptCount ?? 0,
      isReadyToRegister: docs.isComplete,
    },
    businessPartner: {
      bpRole: 'FLCU01 · Customer',
      accountGroup: 'Z001 · Sold-to party',
      partnerCategory: 'Organisation',
      partnerGroup: depot.registrationType === 'Non-BP Depot' ? 'NBP' : 'DEP',
      partnerFunction: 'SP · Sold-to',
      personnelNumber: rep?.employeeId ?? null,
      searchTerm1: depot.name.toUpperCase().slice(0, 20),
      searchTerm2: (depot.province || '').toUpperCase() || null,
      language: 'EN',
      telephone: depot.phone || null,
      mobilePhone: depot.phone || null,
      taxCountry: 'KH',
      taxType: 'KH0',
      taxClass: '1',
      isReadyForSapCreate: docs.isComplete,
    },
  });
}

function toPendingQuotation(q: Quotation): PendingQuotationDto {
  return {
    id: q.id,
    number: q.number,
    customerId: q.customerId,
    customerName: q.customerName,
    status: q.status,
    statusDisplay: QUOTATION_STATUS_LABEL[q.status],
    currency: q.currency,
    net: quotationTotals(q).total,
    lineCount: q.lines.length,
    validTo: q.validTo,
    createdAt: q.submittedAt ?? q.createdAt,
  };
}

/** One row of the depot approval queue, with everything the route and stage need. */
export interface DepotRegistrationRow {
  id: string;
  code: string;
  name: string;
  type: string;
  province: string;
  rep: string;
  submittedAt: string | null;
  status: string;
  creditLimit: number | null;
  creditTermDays: number | null;
  documentsComplete: boolean;
}

function findDepotOrThrow(id: string): Depot {
  const depot = depotStore.get().find((d) => d.id === id);
  if (!depot) throw new Error('This depot registration no longer exists.');
  return depot;
}

export const approvalsApi = {
  /**
   * Quotations sitting at the approval gate.
   *
   * `PendingApproval` is the single status, not a tab group — drafts and documents
   * already decided are nobody's work here.
   */
  pendingQuotations: async (pageSize = 50, signal?: AbortSignal) => {
    const page = await quotationsService.list({ status: 'PendingApproval', pageSize }, signal);
    return { items: page.items.map(toPendingQuotation), totalCount: page.total };
  },

  /** The quotation book, filtered — the queue screen's list. */
  quotations: (query: QuotationListQuery = {}, signal?: AbortSignal) => quotationsService.list(query, signal),

  /** One quotation, in full. Null when it does not exist. */
  quotation: (id: string, signal?: AbortSignal) => quotationsService.get(id, signal),

  approveQuotation: (id: string) => quotationsService.approve(id),

  rejectQuotation: (id: string, reason?: string) => quotationsService.reject(id, reason),

  /** One depot registration, in full. */
  depotDetail: async (id: string, signal?: AbortSignal) => {
    const depot = findDepotOrThrow(id);
    return mockResolve(toDepotDetail(depot), signal);
  },

  /**
   * The bytes of one registration document, produced locally — the decision page shows
   * photographs inline and opens certificates in a new tab.
   */
  depotDocument: (depotId: string, documentId: string, signal?: AbortSignal) =>
    depotDocuments.file(depotId, documentId, signal),

  /**
   * Approves a depot registration.
   *
   * Not a cosmetic change: a final approval registers the depot in SAP, and SAP's
   * customer number replaces the `BP-` placeholder as the depot's code. So the caller
   * must re-read the depot afterwards rather than patching what it already has — the
   * code it knew the depot by may no longer exist.
   */
  approveDepot: (id: string, signal?: AbortSignal) => depotsRepository.approve(id, signal),

  /** Refuses a depot registration. The reason is required and is stored on the record. */
  rejectDepot: (id: string, reason: string, signal?: AbortSignal) => depotsRepository.reject(id, reason, signal),

  /** Depot registrations awaiting credit approval, most recently submitted first. */
  pendingDepots: async (pageSize = 50, signal?: AbortSignal) => {
    const waiting = depotStore
      .get()
      .filter((d) => d.lifecycle && AWAITING_DECISION.includes(d.lifecycle))
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
    const items: PendingDepotDto[] = waiting.slice(0, pageSize).map((d) => {
      const docs = documentSummary(d);
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        city: d.district || d.province || null,
        phone: d.phone || null,
        type: d.registrationType ?? 'Depot (BP)',
        status: d.lifecycle ?? null,
        documentCount: docs.documents.length,
        documentsComplete: docs.isComplete,
        missingRequiredDocuments: docs.missingRequired,
      };
    });
    return mockResolve({ items, totalCount: waiting.length }, signal);
  },

  /**
   * Every registration the approval queue tracks — waiting, refused, drafted, and the
   * ones already approved through it. Master accounts imported from SAP never went
   * through the queue and are not in it.
   */
  depotRegistrations: async (signal?: AbortSignal): Promise<DepotRegistrationRow[]> => {
    const rows = depotStore
      .get()
      .filter((d) => d.submittedAt || d.lifecycle === 'Draft')
      .map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        type: d.registrationType ?? 'Depot (BP)',
        province: d.province,
        rep: repById(d.repId)?.name ?? '',
        submittedAt: d.submittedAt ?? null,
        status: d.lifecycle ?? 'PendingApproval',
        creditLimit: d.creditLimit || null,
        creditTermDays: d.creditTermDays ?? null,
        documentsComplete: documentSummary(d).isComplete,
      }));
    return mockResolve(rows, signal);
  },
};

/**
 * The four request states that mean "somebody still has to sign".
 *
 * Kept as a list rather than a `status` filter because the endpoint takes one status at
 * a time, and asking four times to build one badge is four round trips for a number.
 */
export const IN_CHAIN_STATUSES = [
  'AwaitingPrepare',
  'AwaitingVerify',
  'AwaitingConsultant',
  'AwaitingFinal',
] as const;
