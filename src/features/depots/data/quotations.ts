import { mockDelay, mockResolve, paginate } from '@/services/mock';
import { isoDate } from '@/lib/utilities/demo-clock';
import { lineFor, sellableProducts, type DocumentLine } from '@/features/sales/data/lines';
import {
  DEFAULT_APPROVER,
  type Quotation as SalesQuotation,
  type QuotationStatus as SalesQuotationStatus,
} from '@/features/sales/data/quotations';
import { quotationActions, quotationsStore } from '@/features/sales/store';
import { depotStore } from './depot-store';

/**
 * Quotations, as the approval queue and a depot's Quotations tab see them.
 *
 * This module owns no data. The quotation book is `quotationsStore` in
 * `features/sales` — the same records the Quotations pipeline board, the dashboard
 * and order conversion use. What lives here is a read/write view that maps a sales
 * quotation into the approval shape (status `PendingApproval`, VAT, numbered lines)
 * and routes decisions back through `quotationActions`, so approving a quotation in
 * the queue moves its card on `/quotations`, and the other way round.
 */

export const QUOTATION_STATUSES = ['Draft', 'PendingApproval', 'Approved', 'Rejected', 'Expired'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  Draft: 'Draft',
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Expired: 'Expired',
};

export interface QuotationLine {
  id: string;
  product: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  repId: string;
  repName: string;
  status: QuotationStatus;
  currency: 'USD';
  vatRate: number;
  lines: QuotationLine[];
  deliveryLocation: string;
  createdAt: string;
  submittedAt: string | null;
  validTo: string;
  decidedAt: string | null;
  decidedBy: string | null;
  rejectionReason: string | null;
}

const VAT_RATE = 0.1;

/**
 * The pipeline has a `Converted` stage the approval book does not: a converted
 * quotation was approved first, so the gate reports it as approved.
 */
const STATUS_FROM_SALES: Record<SalesQuotationStatus, QuotationStatus> = {
  Draft: 'Draft',
  Pending: 'PendingApproval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Converted: 'Approved',
};

function toLine(line: DocumentLine, index: number, discount: number): QuotationLine {
  return {
    id: `${index + 1}`,
    product: line.name,
    sku: line.code,
    unit: line.unit,
    quantity: line.qty,
    // The header discount is folded into the price, so the subtotal here equals the
    // amount the pipeline board shows.
    unitPrice: discount ? Math.round(line.unitPrice * (1 - discount / 100) * 10_000) / 10_000 : line.unitPrice,
  };
}

function deliveryLocationFor(depotId: string): string {
  const depot = depotStore.get().find((d) => d.id === depotId);
  if (!depot) return '—';
  return depot.district ? `${depot.district}, ${depot.province}` : depot.province;
}

function toApprovalView(q: SalesQuotation): Quotation {
  return {
    id: q.id,
    number: q.id,
    customerId: q.depotId,
    customerName: q.customer,
    repId: q.repId,
    repName: q.createdBy,
    status: STATUS_FROM_SALES[q.status],
    currency: 'USD',
    vatRate: VAT_RATE,
    lines: q.lines.map((l, i) => toLine(l, i, q.discount)),
    deliveryLocation: deliveryLocationFor(q.depotId),
    createdAt: q.createdAt,
    submittedAt: q.status === 'Draft' ? null : q.submittedAt ?? q.createdAt,
    validTo: q.closing,
    decidedAt: q.decidedAt ?? null,
    decidedBy: q.decidedBy ?? null,
    rejectionReason: q.rejectionReason ?? null,
  };
}

export function quotationTotals(q: Pick<Quotation, 'lines' | 'vatRate'>): { subtotal: number; vat: number; total: number } {
  const subtotal = Math.round(q.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) * 100) / 100;
  const vat = Math.round(subtotal * q.vatRate * 100) / 100;
  return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
}

export interface QuotationListQuery {
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function currentView(id: string): Quotation {
  const found = quotationsStore.get().find((q) => q.id === id);
  if (!found) throw new Error('This quotation no longer exists.');
  return toApprovalView(found);
}

export const quotationsService = {
  async list(query: QuotationListQuery = {}, signal?: AbortSignal) {
    const term = query.search?.trim().toLowerCase();
    const rows = quotationsStore
      .get()
      .map(toApprovalView)
      .filter((q) => !query.customerId || q.customerId === query.customerId)
      .filter((q) => !query.status || q.status === query.status)
      .filter((q) => !term || `${q.number} ${q.customerName} ${q.repName}`.toLowerCase().includes(term))
      .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
    return mockResolve(paginate(rows, query.page ?? 1, query.pageSize ?? 50), signal);
  },

  async get(id: string, signal?: AbortSignal): Promise<Quotation | null> {
    const found = quotationsStore.get().find((q) => q.id === id);
    return mockResolve(found ? toApprovalView(found) : null, signal);
  },

  async approve(id: string, approver = DEFAULT_APPROVER): Promise<Quotation> {
    await mockDelay(500);
    quotationActions.decide(id, 'Approved', { approver });
    return currentView(id);
  },

  async reject(id: string, reason?: string, approver = DEFAULT_APPROVER): Promise<Quotation> {
    await mockDelay(500);
    quotationActions.decide(id, 'Rejected', {
      approver,
      reason: reason?.trim() || 'Returned by the approver without a note.',
    });
    return currentView(id);
  },

  /** A draft started from a depot record — two common lines the rep then edits. */
  async createDraft(customerId: string): Promise<Quotation> {
    await mockDelay();
    const depot = depotStore.get().find((d) => d.id === customerId);
    if (!depot) throw new Error('This depot no longer exists.');
    const first = sellableProducts[0];
    const second = sellableProducts.find((p) => p.categoryId !== first.categoryId) ?? sellableProducts[1];
    const lines = [first, second].map((p) => lineFor(p, p.unit === 'tonne' ? 10 : 100));
    const created = quotationActions.create(
      {
        depotId: customerId,
        repId: depot.repId,
        closing: isoDate(14),
        status: 'Draft',
        discount: 0,
        lines,
        notes: 'Started from the depot record.',
      },
      isoDate(0),
      // Registrations still in approval are not in the CRM master the form hydrates from.
      { customer: depot.name }
    );
    return currentView(created.id);
  },
};
