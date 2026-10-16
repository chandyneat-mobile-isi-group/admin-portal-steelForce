import { requiredApproval } from '@/features/approvals/credit-approval';
import { MY_REP_IDS } from '@/features/depots/data/crm';
import { crmStatusFor, depotSapMetaStore, depotStore, termDaysFrom } from '@/features/depots/data/depot-store';
import { depotDocuments, documentSummary } from '@/features/depots/data/documents';
import type { PageResult } from '@/infrastructure/repositories/types';
import { mockDelay, mockId, mockResolve } from '@/services/mock';
import {
  AWAITING_DECISION,
  type CreateDepotInput,
  type DepotSapOperations,
  type Depot,
  type DepotLifecycle,
  type DepotListQuery,
  type DepotRepository,
  type SapSyncStatus,
  type UpdateDepotInput,
} from './types';

const now = () => new Date().toISOString();

/** A customer number in SAP's range, unique within the store. */
function nextSapNumber(): string {
  const taken = new Set(depotStore.get().map((d) => d.sap?.customerNumber).filter(Boolean));
  let candidate = 1_009_000 + Math.floor(Math.random() * 900);
  while (taken.has(String(candidate))) candidate += 1;
  return String(candidate);
}

/** Replaces one record and returns the stored copy. */
function patch(id: string, fn: (depot: Depot) => Depot): Depot {
  let updated: Depot | undefined;
  depotStore.update((all) =>
    all.map((depot) => {
      if (depot.id !== id) return depot;
      updated = fn(depot);
      return updated;
    })
  );
  if (!updated) throw new Error('This depot no longer exists.');
  return updated;
}

function withLifecycle(depot: Depot, lifecycle: DepotLifecycle): Depot {
  return {
    ...depot,
    lifecycle,
    status: crmStatusFor(lifecycle, depot.status),
    canTrade: lifecycle === 'Active',
  };
}

/**
 * The registration lands in SAP: the depot adopts the customer number SAP issues and
 * the code it was known by moves to `previousCode`. This is the step that makes a
 * depot tradeable.
 */
function registerInSap(depot: Depot): Depot {
  const at = now();
  const customerNumber = depot.sap?.customerNumber ?? nextSapNumber();
  const swapped = depot.code !== customerNumber;
  return {
    ...withLifecycle(depot, 'Active'),
    code: customerNumber,
    previousCode: swapped ? depot.code : depot.previousCode ?? null,
    sapId: customerNumber,
    approvedAt: depot.approvedAt ?? at,
    sap: {
      status: 'Registered',
      customerNumber,
      submittedAt: depot.sap?.submittedAt ?? at,
      registeredAt: at,
      lastError: null,
      attemptCount: (depot.sap?.attemptCount ?? 0) + 1,
      lastPulledAt: depot.sap?.lastPulledAt ?? null,
    },
  };
}

/** Adds the document checklist a detail view needs. */
function withDocuments(depot: Depot): Depot {
  const docs = documentSummary(depot);
  return {
    ...depot,
    documents: docs.documents.map((d) => ({ id: d.id, kind: d.type, fileName: d.fileName })),
    missingRequiredDocuments: docs.missingRequired,
    documentsComplete: docs.isComplete,
  };
}

/** Sort key: most recent activity first, so a new registration lands at the top. */
function recency(depot: Depot): string {
  return depot.submittedAt ?? depot.createdAt ?? '';
}

/**
 * The depot repository for the static prototype.
 *
 * Backed by one persisted collection, so a depot created, approved or suspended here
 * is the same record every other screen reads. Lifecycle methods enforce the same
 * transitions the API does and throw a readable error for an illegal one.
 */
export class MockDepotRepository implements DepotRepository {
  async list(query: DepotListQuery = {}, signal?: AbortSignal): Promise<PageResult<Depot>> {
    const term = query.search?.trim().toLocaleLowerCase();
    const filtered = depotStore
      .get()
      .filter((depot) => {
        if (query.scope === 'assigned' && !MY_REP_IDS.includes(depot.repId)) return false;
        if (query.status && depot.status !== query.status) return false;
        if (query.lifecycle && depot.lifecycle !== query.lifecycle) return false;
        if (query.lifecycles && (!depot.lifecycle || !query.lifecycles.includes(depot.lifecycle))) return false;
        if (query.salesRepId && depot.repId !== query.salesRepId) return false;
        if (!term) return true;
        return [depot.name, depot.code, depot.previousCode, depot.email, depot.phone, depot.contactPerson]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(term));
      })
      .sort((a, b) => recency(b).localeCompare(recency(a)));

    const pageSize = query.pageSize ?? query.limit ?? filtered.length;
    const page = query.page ?? 1;
    const start = Math.max(0, page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return mockResolve(
      { items, total: filtered.length, nextCursor: start + pageSize < filtered.length ? String(page + 1) : null },
      signal
    );
  }

  async getById(id: string, signal?: AbortSignal): Promise<Depot | null> {
    const depot = depotStore.get().find((d) => d.id === id);
    return mockResolve(depot ? withDocuments(depot) : null, signal);
  }

  /** Creates a draft registration. Submitting it for approval is a separate act. */
  async create(input: CreateDepotInput, signal?: AbortSignal): Promise<Depot> {
    await mockDelay(450, signal);
    if (!input.name?.trim()) throw new Error('A depot needs a name.');
    const id = mockId('DEP');
    const lat = input.lat ?? input.latitude ?? null;
    const lng = input.lng ?? input.longitude ?? null;
    const today = now().slice(0, 10);
    const code = input.code?.trim() || `BP-${today.slice(0, 7).replace('-', '')}-${id.slice(-5).toUpperCase()}`;
    const depot: Depot = {
      code,
      type: 'Depot',
      salesOrg: 'ISI Distribution',
      division: 'Retail',
      province: '',
      district: '',
      address: '',
      contactPerson: '',
      phone: '',
      workingHours: '07:30 - 17:30',
      creditStatus: 'Good Standing',
      creditLimit: 0,
      outstanding: 0,
      outstandingOrders: 0,
      lastVisit: null,
      totalVisits: 0,
      lifetimeValue: 0,
      tier: 'Bronze',
      notes: '',
      industry: '',
      category: 'Standard',
      segment: 'Small business',
      paymentTerms: 'Net 30',
      email: '',
      website: '',
      registrationNo: '',
      salesValue: 0,
      monthlyRevenue: 0,
      nextFollowUp: null,
      repId: MY_REP_IDS[0],
      openOpportunities: 0,
      ...input,
      id,
      name: input.name.trim(),
      lat: lat ?? 0,
      lng: lng ?? 0,
      latitude: lat,
      longitude: lng,
      createdAt: today,
      status: 'Prospect',
      lifecycle: 'Draft',
      registrationType: input.registrationType ?? 'Depot (BP)',
      creditTermDays: input.creditTermDays ?? termDaysFrom(input.paymentTerms),
      canTrade: false,
      sapId: '',
      previousCode: null,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      contacts: (input.contacts?.length ? input.contacts : input.contactPerson
        ? [{ id: 'c1', name: input.contactPerson, role: 'Owner', phone: input.phone ?? '', email: input.email, isPrimary: true }]
        : []
      ).map((contact, n) => ({ ...contact, id: `${id}-c${n + 1}` })),
      sap: {
        status: 'NotSubmitted',
        customerNumber: null,
        submittedAt: null,
        registeredAt: null,
        lastError: null,
        attemptCount: 0,
      },
    };
    depotStore.update((all) => [depot, ...all]);
    depotDocuments.initialise(id);
    return withDocuments(depot);
  }

  async update(id: string, input: UpdateDepotInput, signal?: AbortSignal): Promise<Depot> {
    await mockDelay(undefined, signal);
    // Identity and lifecycle are not edits; they change through their own acts.
    const { id: _id, lifecycle: _lifecycle, sap: _sap, ...editable } = input;
    return withDocuments(
      patch(id, (depot) => ({
        ...depot,
        ...editable,
        creditTermDays:
          editable.creditTermDays !== undefined
            ? editable.creditTermDays
            : editable.paymentTerms
              ? termDaysFrom(editable.paymentTerms)
              : depot.creditTermDays,
      }))
    );
  }

  async delete(id: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(undefined, signal);
    const before = depotStore.get().length;
    depotStore.update((all) => all.filter((depot) => depot.id !== id));
    if (depotStore.get().length === before) throw new Error('This depot no longer exists.');
  }

  async submit(id: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(undefined, signal);
    patch(id, (depot) => {
      if (depot.lifecycle !== 'Draft' && depot.lifecycle !== 'Rejected') {
        throw new Error(`${depot.name} has already been submitted.`);
      }
      return {
        ...withLifecycle(depot, 'PendingApproval'),
        submittedAt: now(),
        rejectedAt: null,
        rejectionReason: null,
      };
    });
  }

  /**
   * Advances a registration one stage. An L4 depot (National Sales Committee) needs the
   * RSM's endorsement first; every other approval is final and pushes the depot to SAP,
   * which issues its customer number and makes it Active.
   */
  async approve(id: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(600, signal);
    patch(id, (depot) => {
      if (!depot.lifecycle || !AWAITING_DECISION.includes(depot.lifecycle)) {
        throw new Error(`${depot.name} is not waiting for approval.`);
      }
      const required = requiredApproval(depot.creditLimit || null, depot.creditTermDays ?? null);
      const needsNsc = required.kind === 'level' && required.level === 4;
      if (depot.lifecycle === 'PendingApproval' && needsNsc) {
        return withLifecycle(depot, 'RegionManagerApproved');
      }
      return registerInSap({ ...depot, approvedAt: now() });
    });
  }

  async reject(id: string, reason: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(500, signal);
    const trimmed = reason.trim();
    if (trimmed.length < 3) throw new Error('Give a reason of at least 3 characters.');
    patch(id, (depot) => {
      if (!depot.lifecycle || !AWAITING_DECISION.includes(depot.lifecycle)) {
        throw new Error(`${depot.name} is not waiting for a decision.`);
      }
      return {
        ...withLifecycle(depot, 'Rejected'),
        rejectedAt: now(),
        rejectionReason: trimmed,
        sap: depot.sap ? { ...depot.sap, status: 'NotSubmitted', submittedAt: null } : depot.sap,
      };
    });
  }

  async suspend(id: string, reason?: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(undefined, signal);
    patch(id, (depot) => {
      if (depot.lifecycle !== 'Active') throw new Error(`Only an active depot can be suspended.`);
      return { ...withLifecycle(depot, 'Suspended'), suspendedAt: now(), suspensionReason: reason?.trim() || null };
    });
  }

  async reinstate(id: string, signal?: AbortSignal): Promise<void> {
    await mockDelay(undefined, signal);
    patch(id, (depot) => {
      if (depot.lifecycle !== 'Suspended') throw new Error(`${depot.name} is not suspended.`);
      return { ...withLifecycle(depot, 'Active'), status: 'Active', suspendedAt: null, suspensionReason: null };
    });
  }

  async getByCode(code: string, signal?: AbortSignal): Promise<Depot | null> {
    const wanted = code.trim().toLowerCase();
    const depot = depotStore
      .get()
      .find((d) => d.code.toLowerCase() === wanted || d.previousCode?.toLowerCase() === wanted);
    return mockResolve(depot ? withDocuments(depot) : null, signal);
  }

  /**
   * The SAP boundary, simulated against the store. Counts are derived from the
   * records, so approving a depot or pushing the queue moves them.
   */
  readonly sap: DepotSapOperations = {
    async status(signal?: AbortSignal): Promise<SapSyncStatus> {
      const all = depotStore.get();
      const of = (status: string) => all.filter((d) => d.sap?.status === status);
      const registered = of('Registered');
      const pending = of('Pending');
      const meta = depotSapMetaStore.get();
      const latest = registered.map((d) => d.sap?.registeredAt ?? '').sort().pop() || null;
      const oldest = pending.map((d) => d.sap?.submittedAt ?? '').filter(Boolean).sort()[0] ?? null;
      return mockResolve(
        {
          total: all.length,
          registered: registered.length,
          pending: pending.length,
          rejected: of('Rejected').length,
          notSubmitted: all.length - registered.length - pending.length - of('Rejected').length,
          lastRegisteredAt: latest,
          oldestPendingAt: oldest,
          lastPulledAt: meta.lastPulledAt,
          lastReferencesAt: meta.lastReferencesAt,
        },
        signal
      );
    },

    async pullMasterData(signal?: AbortSignal): Promise<void> {
      await mockDelay(1200, signal);
      const at = now();
      depotStore.update((all) =>
        all.map((d) => (d.sap?.status === 'Registered' ? { ...d, sap: { ...d.sap, lastPulledAt: at } } : d))
      );
      depotSapMetaStore.update((meta) => ({ ...meta, lastPulledAt: at }));
    },

    async pullReferences(signal?: AbortSignal): Promise<void> {
      await mockDelay(800, signal);
      depotSapMetaStore.update((meta) => ({ ...meta, lastReferencesAt: now() }));
    },

    /**
     * Registers every queued depot. A registration still missing a required document
     * is refused, as SAP refuses a partner without its tax evidence.
     */
    async pushPending(signal?: AbortSignal): Promise<void> {
      await mockDelay(1400, signal);
      depotStore.update((all) =>
        all.map((d) => {
          if (d.sap?.status !== 'Pending') return d;
          const docs = documentSummary(d);
          if (!docs.isComplete) {
            return {
              ...d,
              sap: {
                ...d.sap,
                status: 'Rejected',
                attemptCount: d.sap.attemptCount + 1,
                lastError: `SAP refused the partner: required documents missing (${docs.missingRequired.join(', ')}).`,
              },
            };
          }
          return registerInSap(d);
        })
      );
    },

    async retryRejected(customerIds?: string[], signal?: AbortSignal): Promise<void> {
      await mockDelay(600, signal);
      const only = customerIds && customerIds.length > 0 ? new Set(customerIds) : null;
      depotStore.update((all) =>
        all.map((d) =>
          d.sap?.status === 'Rejected' && (!only || only.has(d.id))
            ? { ...d, sap: { ...d.sap, status: 'Pending', submittedAt: now(), lastError: null } }
            : d
        )
      );
    },
  };
}
