'use client';

import { createObservableStore, useObservableStore } from '@/hooks/use-observable-store';
import { crmDepotById } from '@/features/depots/data/crm';
import { buildOrders, nextOrderId, type SalesOrder } from './data/orders';
import { buildQuotations, DEFAULT_APPROVER, nextQuotationId, type Quotation } from './data/quotations';
import { documentTotal, repName } from './data/lines';

/**
 * Persisted orders and quotations for the prototype. Writes survive a refresh and
 * are cleared by Settings → Reset demo data.
 *
 * `quotationsStore` is the only quotation collection: the approval queue and the
 * depot Quotations tab read and write it through `features/depots/data/quotations`.
 */
export const ordersStore = createObservableStore<SalesOrder[]>('sales.orders', buildOrders);
export const quotationsStore = createObservableStore<Quotation[]>('sales.quotations', buildQuotations);

export const useOrders = () => useObservableStore(ordersStore);
export const useQuotations = () => useObservableStore(quotationsStore);

export type OrderDraft = Pick<
  SalesOrder,
  'depotId' | 'repId' | 'date' | 'deliveryDate' | 'status' | 'payment' | 'discount' | 'lines' | 'notes'
>;

function hydrateOrder(draft: OrderDraft): Omit<SalesOrder, 'id'> {
  const depot = crmDepotById[draft.depotId];
  return {
    ...draft,
    customer: depot?.name ?? draft.depotId,
    province: depot?.province ?? '',
    rep: repName(draft.repId),
    total: documentTotal(draft.lines, draft.discount),
  };
}

export const orderActions = {
  create(draft: OrderDraft, extra?: Partial<SalesOrder>): SalesOrder {
    let created!: SalesOrder;
    ordersStore.update((list) => {
      created = { id: nextOrderId(list), ...hydrateOrder(draft), ...extra };
      return [created, ...list];
    });
    return created;
  },
  update(id: string, draft: OrderDraft) {
    ordersStore.update((list) => list.map((o) => (o.id === id ? { ...o, ...hydrateOrder(draft) } : o)));
  },
  patch(id: string, patch: Partial<Pick<SalesOrder, 'status' | 'payment'>>) {
    ordersStore.update((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  },
  remove(id: string) {
    ordersStore.update((list) => list.filter((o) => o.id !== id));
  },
};

export type QuotationDraft = Pick<
  Quotation,
  'depotId' | 'repId' | 'closing' | 'status' | 'discount' | 'lines' | 'notes'
>;

function hydrateQuotation(draft: QuotationDraft) {
  return {
    ...draft,
    customer: crmDepotById[draft.depotId]?.name ?? draft.depotId,
    createdBy: repName(draft.repId),
    amount: documentTotal(draft.lines, draft.discount),
  };
}

/** The approval bookkeeping that goes with moving a quotation into `status`. */
function statusStamp(q: Quotation, status: Quotation['status'], approver = DEFAULT_APPROVER): Partial<Quotation> {
  const now = new Date().toISOString();
  switch (status) {
    case 'Draft':
      return { submittedAt: null, decidedAt: null, decidedBy: null, rejectionReason: null };
    case 'Pending':
      return { submittedAt: now, decidedAt: null, decidedBy: null, rejectionReason: null };
    case 'Approved':
    case 'Rejected':
      return {
        submittedAt: q.submittedAt ?? now,
        decidedAt: now,
        decidedBy: approver,
        rejectionReason: status === 'Rejected' ? q.rejectionReason ?? 'Returned by the approver without a note.' : null,
      };
    default:
      return { submittedAt: q.submittedAt ?? now, decidedAt: q.decidedAt ?? now, decidedBy: q.decidedBy ?? approver };
  }
}

export const quotationActions = {
  create(draft: QuotationDraft, createdAt: string, extra?: Partial<Quotation>): Quotation {
    let created!: Quotation;
    quotationsStore.update((list) => {
      const base = { id: nextQuotationId(list), createdAt, ...hydrateQuotation(draft) };
      created = { ...base, ...statusStamp(base, draft.status), ...extra };
      return [created, ...list];
    });
    return created;
  },
  update(id: string, draft: QuotationDraft) {
    quotationsStore.update((list) =>
      list.map((q) =>
        q.id === id
          ? { ...q, ...hydrateQuotation(draft), ...(q.status !== draft.status ? statusStamp(q, draft.status) : {}) }
          : q
      )
    );
  },
  setStatus(id: string, status: Quotation['status']) {
    quotationsStore.update((list) =>
      list.map((q) => (q.id === id && q.status !== status ? { ...q, status, ...statusStamp(q, status) } : q))
    );
  },
  /**
   * Decides a quotation at the approval gate. Throws unless it is `Pending`, so a
   * decision taken twice (two tabs, two screens) fails loudly instead of re-stamping.
   */
  decide(id: string, decision: 'Approved' | 'Rejected', options: { reason?: string; approver?: string } = {}): Quotation {
    let updated: Quotation | undefined;
    quotationsStore.update((list) =>
      list.map((q) => {
        if (q.id !== id) return q;
        if (q.status !== 'Pending') throw new Error(`${q.id} is not waiting for approval.`);
        const withReason = { ...q, rejectionReason: decision === 'Rejected' ? options.reason?.trim() || null : null };
        updated = { ...withReason, status: decision, ...statusStamp(withReason, decision, options.approver) };
        return updated;
      })
    );
    if (!updated) throw new Error('This quotation no longer exists.');
    return updated;
  },
  remove(id: string) {
    quotationsStore.update((list) => list.filter((q) => q.id !== id));
  },
  /** Raises a sales order from an approved quotation and links the two. */
  convert(id: string, today: string): SalesOrder | null {
    const quote = quotationsStore.get().find((q) => q.id === id);
    if (!quote) return null;
    const order = orderActions.create(
      {
        depotId: quote.depotId,
        repId: quote.repId,
        date: today,
        deliveryDate: today,
        status: 'Confirmed',
        payment: 'Unpaid',
        discount: quote.discount,
        lines: quote.lines,
        notes: `Raised from ${quote.id}.`,
      },
      { quotationId: quote.id }
    );
    quotationsStore.update((list) =>
      list.map((q) => (q.id === id ? { ...q, status: 'Converted', orderId: order.id, ...statusStamp(q, 'Converted') } : q))
    );
    return order;
  },
};
