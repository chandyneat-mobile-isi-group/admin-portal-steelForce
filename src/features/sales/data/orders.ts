import { makeRng } from '@/lib/utilities/random';
import { isoDate } from '@/lib/utilities/demo-clock';
import { documentTotal, randomLines, repForDepot, repName, tradingDepots, type DocumentLine } from './lines';

/**
 * Sales orders.
 *
 * 140 orders over the four months to the demo date, numbered so the newest is
 * ORD-2845 — the same order the dashboard and notifications refer to.
 */

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial', 'Unpaid', 'Refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface SalesOrder {
  id: string;
  depotId: string;
  customer: string;
  province: string;
  repId: string;
  rep: string;
  /** ISO date the order was placed. */
  date: string;
  /** ISO date delivery is promised for. */
  deliveryDate: string;
  status: OrderStatus;
  payment: PaymentStatus;
  discount: number;
  lines: DocumentLine[];
  total: number;
  notes: string;
  quotationId?: string;
}

const NOTES = [
  'Deliver to site gate before 10:00; forklift available on site.',
  'Customer collects from Phnom Penh warehouse.',
  'Split delivery across two trucks.',
  'Mill test certificate required with delivery.',
  'Call site foreman 30 minutes before arrival.',
  '',
  '',
  '',
];

function statusForAge(rng: ReturnType<typeof makeRng>, ageDays: number): OrderStatus {
  if (ageDays <= 3) return rng.weighted([['Pending', 4], ['Confirmed', 4], ['Processing', 2], ['Cancelled', 0.3]]);
  if (ageDays <= 14) return rng.weighted([['Confirmed', 2], ['Processing', 4], ['Completed', 3], ['Cancelled', 0.5]]);
  return rng.weighted([['Completed', 12], ['Cancelled', 1], ['Processing', 0.5]]);
}

function paymentFor(rng: ReturnType<typeof makeRng>, status: OrderStatus): PaymentStatus {
  switch (status) {
    case 'Pending':
      return 'Unpaid';
    case 'Confirmed':
      return rng.weighted([['Unpaid', 3], ['Pending', 3], ['Paid', 1]]);
    case 'Processing':
      return rng.weighted([['Pending', 3], ['Partial', 2], ['Paid', 2]]);
    case 'Completed':
      return rng.weighted([['Paid', 9], ['Partial', 1]]);
    case 'Cancelled':
      return rng.weighted([['Refunded', 2], ['Unpaid', 1]]);
  }
}

export function buildOrders(): SalesOrder[] {
  const rng = makeRng(28451);
  const list: SalesOrder[] = [];
  const COUNT = 140;
  let age = 0;
  for (let i = 0; i < COUNT; i += 1) {
    // Roughly one to two orders a working day.
    if (i > 0 && rng.chance(0.55)) age += rng.int(1, 2);
    const depot = rng.pick(tradingDepots);
    const status = statusForAge(rng, age);
    const discount = rng.weighted<number>([[0, 5], [2, 2], [3, 2], [5, 2], [8, 1]]);
    const lines = randomLines(rng);
    const repId = repForDepot(rng, depot);
    list.push({
      id: `ORD-${2845 - i}`,
      depotId: depot.id,
      customer: depot.name,
      province: depot.province,
      repId,
      rep: repName(repId),
      date: isoDate(-age),
      deliveryDate: isoDate(-age + rng.int(2, 9)),
      status,
      payment: paymentFor(rng, status),
      discount,
      lines,
      total: documentTotal(lines, discount),
      notes: rng.pick(NOTES),
    });
  }
  return list;
}

/** Next free order number, continuing the ORD-#### sequence. */
export function nextOrderId(existing: readonly SalesOrder[]): string {
  const max = existing.reduce((m, o) => Math.max(m, Number(o.id.replace(/\D/g, '')) || 0), 2845);
  return `ORD-${max + 1}`;
}
