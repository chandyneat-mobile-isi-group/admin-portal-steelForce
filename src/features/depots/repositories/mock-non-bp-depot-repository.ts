import { nonBpStore } from '@/features/depots/data/non-bp';
import type { PageResult } from '@/infrastructure/repositories/types';
import { mockDelay, mockId, mockResolve } from '@/services/mock';
import type { MockDepotRepository } from './mock-depot-repository';
import type {
  CreateNonBpDepotInput,
  NonBpDepot,
  NonBpDepotListQuery,
  NonBpDepotRepository,
} from './non-bp-types';

const DECIDER = 'Sok Dara (Area Sales Manager)';

/** Status order for the queue: what needs a decision first. */
const STATUS_RANK: Record<NonBpDepot['status'], number> = { Pending: 0, Approved: 1, Rejected: 2, Converted: 3 };

function patch(id: string, fn: (row: NonBpDepot) => NonBpDepot): NonBpDepot {
  let updated: NonBpDepot | undefined;
  nonBpStore.update((all) =>
    all.map((row) => {
      if (row.id !== id) return row;
      updated = fn(row);
      return updated;
    })
  );
  if (!updated) throw new Error('This prospect no longer exists.');
  return updated;
}

/**
 * Prospects for the static prototype, persisted locally.
 *
 * Converting goes through the depot repository, so a converted prospect becomes a
 * real registration in the depot master and the credit-approval queue.
 */
export class MockNonBpDepotRepository implements NonBpDepotRepository {
  constructor(private readonly depots: () => MockDepotRepository) {}

  async list(query: NonBpDepotListQuery = {}, signal?: AbortSignal): Promise<PageResult<NonBpDepot>> {
    const term = query.search?.trim().toLocaleLowerCase();
    const filtered = nonBpStore
      .get()
      .filter((row) => {
        if (query.status && row.status !== query.status) return false;
        if (query.createdBySalesRepId && row.createdBySalesRepId !== query.createdBySalesRepId) return false;
        if (query.territoryCode && row.territoryCode !== query.territoryCode) return false;
        if (!term) return true;
        return [row.name, row.contactPerson, row.phone, row.city, row.district, row.province]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(term));
      })
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      );
    const pageSize = query.pageSize ?? query.limit ?? filtered.length;
    const page = query.page ?? 1;
    const start = Math.max(0, page - 1) * pageSize;
    return mockResolve(
      {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        nextCursor: start + pageSize < filtered.length ? String(page + 1) : null,
      },
      signal
    );
  }

  async getById(id: string, signal?: AbortSignal): Promise<NonBpDepot | null> {
    return mockResolve(nonBpStore.get().find((row) => row.id === id) ?? null, signal);
  }

  async create(input: CreateNonBpDepotInput, signal?: AbortSignal): Promise<NonBpDepot> {
    await mockDelay(450, signal);
    if (!input.name.trim()) throw new Error('A prospect needs a shop name.');
    const row: NonBpDepot = {
      code: null,
      phone: null,
      email: null,
      contactPerson: null,
      district: null,
      province: null,
      latitude: null,
      longitude: null,
      description: null,
      outletType: null,
      targetProduct: null,
      estimatedPotential: null,
      territoryCode: null,
      servingCustomerId: null,
      createdBySalesRepId: '',
      ...input,
      id: mockId('NBP'),
      name: input.name.trim(),
      status: 'Pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
    nonBpStore.update((all) => [row, ...all]);
    return row;
  }

  async approve(id: string, signal?: AbortSignal): Promise<NonBpDepot> {
    await mockDelay(undefined, signal);
    return patch(id, (row) => {
      if (row.status !== 'Pending') throw new Error(`${row.name} is not waiting for a decision.`);
      return { ...row, status: 'Approved', approvedBy: DECIDER, approvedAt: new Date().toISOString() };
    });
  }

  async reject(id: string, reason: string, signal?: AbortSignal): Promise<NonBpDepot> {
    await mockDelay(undefined, signal);
    if (reason.trim().length < 3) throw new Error('Give a reason of at least 3 characters.');
    return patch(id, (row) => {
      if (row.status !== 'Pending') throw new Error(`${row.name} is not waiting for a decision.`);
      return {
        ...row,
        status: 'Rejected',
        rejectedBy: DECIDER,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason.trim(),
      };
    });
  }

  async convert(id: string, signal?: AbortSignal): Promise<string> {
    const row = nonBpStore.get().find((r) => r.id === id);
    if (!row) throw new Error('This prospect no longer exists.');
    if (row.status !== 'Approved') throw new Error('Only an approved prospect can be converted.');

    const repo = this.depots();
    const depot = await repo.create(
      {
        name: row.name,
        type: row.outletType ?? 'Hardware Shop',
        registrationType: 'Non-BP Depot',
        contactPerson: row.contactPerson ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        province: row.province ?? '',
        district: row.district ?? row.city,
        address: [row.addressLine1, row.district, row.province].filter(Boolean).join(', '),
        addressLine1: row.addressLine1,
        lat: row.latitude ?? undefined,
        lng: row.longitude ?? undefined,
        repId: row.createdBySalesRepId,
        notes: row.description ?? '',
        monthlyRevenue: row.estimatedPotential ?? 0,
        // A first credit line a new account would be offered; the approver may change it.
        creditLimit: Math.max(2000, Math.round(((row.estimatedPotential ?? 3000) * 0.5) / 500) * 500),
        paymentTerms: 'Net 15',
      },
      signal
    );
    await repo.submit(depot.id, signal);
    patch(id, (r) => ({ ...r, status: 'Converted', convertedCustomerId: depot.id, convertedAt: new Date().toISOString() }));
    return depot.id;
  }
}
