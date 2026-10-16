import type { CrmDepot } from '@/features/depots/data/crm';
import type { CrudRepository, ListQuery } from '@/infrastructure/repositories/types';

/**
 * The model the depot screens render.
 *
 * `CrmDepot` plus the registration lifecycle the API actually reports. The CRM
 * `status` is a lossy reading of it — `PendingApproval` and `RegionManagerApproved`
 * both become "Prospect" — which is fine for a commercial list and useless for an
 * approval queue. Carrying both keeps the existing screens working and gives the
 * queue the truth.
 *
 * Optional because the demo master has no lifecycle at all.
 */
export type Depot = CrmDepot & {
  lifecycle?: DepotLifecycle;

  /**
   * Fields only `GET /admin/depots/{id}` returns.
   *
   * The list projection is deliberately thin — seven columns for six thousand rows —
   * so everything below is undefined on a row that came from the list and populated
   * once the detail has been fetched. A panel that needs them must load the record.
   */
  telegram?: string;
  sapId?: string;
  canTrade?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  creditTermDays?: number | null;
  documents?: { id: string; kind?: string; url?: string; fileName?: string }[];
  missingRequiredDocuments?: string[];
  documentsComplete?: boolean;

  // ── Registration workflow, kept on the record by the prototype store ────
  /** The code the depot carried before SAP issued its customer number. */
  previousCode?: string | null;
  khmerName?: string;
  /** How the registration entered the portal; drives the approval queue's Type column. */
  registrationType?: 'Depot (BP)' | 'Non-BP Depot';
  /** Set once a registration is submitted. Master records imported from SAP have none. */
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  /** Kept with the record so the representative learns what to fix. */
  rejectionReason?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  contacts?: DepotContact[];
  sap?: DepotSapState;
};

export interface DepotContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export type DepotSapRegistrationStatus = 'NotSubmitted' | 'Pending' | 'Registered' | 'Rejected';

/** Where the depot stands with SAP. */
export interface DepotSapState {
  status: DepotSapRegistrationStatus;
  customerNumber: string | null;
  submittedAt: string | null;
  registeredAt: string | null;
  lastError: string | null;
  attemptCount: number;
  lastPulledAt?: string | null;
}

/**
 * The registration lifecycle exactly as the backend models it.
 *
 * Distinct from `DepotStatus`, which is the CRM reading the demo screens grew around
 * ("Needs Follow-up", "At Risk"). Approval works on *this* vocabulary, so the approval
 * queue must not be filtered through a translation that cannot represent
 * `RegionManagerApproved`.
 */
export const DEPOT_LIFECYCLE = [
  'Draft',
  'PendingApproval',
  'RegionManagerApproved',
  'SalesManagerApproved',
  'Active',
  'Suspended',
  'Rejected',
  'Closed',
] as const;

export type DepotLifecycle = (typeof DEPOT_LIFECYCLE)[number];

/** The states where somebody is still waiting on a decision. */
export const AWAITING_DECISION: readonly DepotLifecycle[] = [
  'PendingApproval',
  'RegionManagerApproved',
  'SalesManagerApproved',
];

export interface DepotListQuery extends ListQuery {
  status?: Depot['status'];
  /** Registration lifecycle filter, which the API understands directly. */
  lifecycle?: DepotLifecycle;
  /** Several lifecycle states at once — "awaiting approval" is three of them. */
  lifecycles?: readonly DepotLifecycle[];
  salesRepId?: string;
  /** Semantic scope only; the eventual API adapter owns its wire representation. */
  scope?: 'assigned' | 'all';
}

/** Create and update take any subset of the record; lifecycle changes go through their own acts. */
export type CreateDepotInput = Partial<Depot>;
export type UpdateDepotInput = Partial<Depot>;

/**
 * How far the depot master and SAP have drifted apart.
 *
 * `oldestPendingAt` is the number to watch: a submission from three days ago means
 * the push has not run, which no count on its own reveals.
 */
export interface SapSyncStatus {
  total: number;
  registered: number;
  pending: number;
  rejected: number;
  notSubmitted: number;
  lastRegisteredAt: string | null;
  oldestPendingAt: string | null;
  /** When master data was last pulled down, and when the catalogues were refreshed. */
  lastPulledAt?: string | null;
  lastReferencesAt?: string | null;
}

/**
 * SAP is a two-way boundary and the directions are not symmetrical.
 *
 * Pulling master data down is a read that overwrites nothing an operator typed.
 * Pushing registrations up creates records in the ERP, which is not reversible from
 * here. They are separate methods so a screen cannot offer one while meaning the
 * other, and so the riskier direction can be confirmed on its own.
 */
export interface DepotSapOperations {
  /** Counts and timestamps behind the sync buttons. */
  status(signal?: AbortSignal): Promise<SapSyncStatus>;

  /** Pulls customer master data down from SAP. Safe to repeat. */
  pullMasterData(signal?: AbortSignal): Promise<void>;

  /** Refreshes the SAP catalogues the edit forms use. Additive; drops nothing. */
  pullReferences(signal?: AbortSignal): Promise<void>;

  /** Pushes queued registrations up to SAP. Creates records in the ERP. */
  pushPending(signal?: AbortSignal): Promise<void>;

  /** Re-queues rejected registrations. Empty list means all of them. */
  retryRejected(customerIds?: string[], signal?: AbortSignal): Promise<void>;
}

export interface DepotRepository
  extends CrudRepository<Depot, CreateDepotInput, UpdateDepotInput, DepotListQuery> {
  /**
   * Registration lifecycle, which the API models as acts rather than as a status
   * field on update: each carries its own permission and its own audit row.
   * Approving a depot is not the same kind of event as correcting its phone number.
   */
  submit(id: string, signal?: AbortSignal): Promise<void>;
  approve(id: string, signal?: AbortSignal): Promise<void>;
  /** Refuses a registration. The reason is required and is stored on the record. */
  reject(id: string, reason: string, signal?: AbortSignal): Promise<void>;
  suspend(id: string, reason?: string, signal?: AbortSignal): Promise<void>;
  reinstate(id: string, signal?: AbortSignal): Promise<void>;

  /** Resolves a trading code, including one SAP has since replaced. */
  getByCode(code: string, signal?: AbortSignal): Promise<Depot | null>;

  /** The SAP boundary, grouped so it reads as one subsystem rather than five methods. */
  readonly sap: DepotSapOperations;
}
