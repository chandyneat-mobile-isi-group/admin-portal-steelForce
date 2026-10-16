import { makeRng } from '@/lib/utilities/random';
import { isoDate } from '@/lib/utilities/demo-clock';
import { MY_REP_IDS } from '@/features/depots/data/crm';
import { documentTotal, randomLines, repForDepot, repName, tradingDepots, type DocumentLine } from './lines';

/**
 * Quotations on the sales pipeline board. Each one references a real depot,
 * its account rep and catalogue SKUs; a converted quotation names the order it
 * became.
 *
 * This is the one quotation book in the prototype. The approval queue and a depot's
 * Quotations tab read it through the adapter in `features/depots/data/quotations`,
 * so a decision taken on either screen is the same write.
 */

export const QUOTATION_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected', 'Converted'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface Quotation {
  id: string;
  depotId: string;
  customer: string;
  repId: string;
  createdBy: string;
  createdAt: string;
  /** Validity end / expected closing date (ISO). */
  closing: string;
  status: QuotationStatus;
  discount: number;
  lines: DocumentLine[];
  amount: number;
  notes: string;
  orderId?: string;
  /** When it went to the approval gate (ISO). Absent for drafts. */
  submittedAt?: string | null;
  /** When an approver approved or rejected it (ISO). */
  decidedAt?: string | null;
  decidedBy?: string | null;
  rejectionReason?: string | null;
}

/** The approver every demo decision is attributed to. */
export const DEFAULT_APPROVER = 'Sok Dara (Sales Manager)';

const REJECTION_REASONS = [
  'Discount on deformed bar exceeds the depot band for this quarter.',
  'Credit exposure would pass the approved limit; ask for a deposit.',
  'Roofing price below floor after the August list-price change.',
];

const PLAN: Array<[QuotationStatus, number]> = [
  ['Draft', 6],
  ['Pending', 16],
  ['Approved', 7],
  ['Rejected', 4],
  ['Converted', 11],
];

const NOTES = [
  'Price held for 14 days against current mill rate.',
  'Project: 5-storey shophouse, Sen Sok.',
  'Customer comparing against competitor rebar quote.',
  'Includes transport to site.',
  '',
  '',
];

const myTradingDepots = tradingDepots.filter((d) => MY_REP_IDS.includes(d.repId));

export function buildQuotations(): Quotation[] {
  const rng = makeRng(14510);
  const list: Quotation[] = [];
  // Numbered downwards from the newest, QUO-157.
  let n = 157;
  let orderRef = 2840;
  for (const [status, count] of PLAN) {
    for (let i = 0; i < count; i += 1) {
      // Mostly the territory this login owns, so My Depots and the approval queue overlap.
      const depot = rng.chance(0.65) ? rng.pick(myTradingDepots) : rng.pick(tradingDepots);
      const created = status === 'Converted' || status === 'Rejected' ? rng.int(10, 45) : rng.int(0, 12);
      const discount = rng.weighted<number>([[0, 4], [3, 2], [5, 3], [8, 2], [10, 1], [12, 1]]);
      const lines = randomLines(rng, 2, 8);
      const repId = repForDepot(rng, depot);
      const decided = status === 'Approved' || status === 'Rejected' || status === 'Converted';
      list.push({
        id: `QUO-${n}`,
        depotId: depot.id,
        customer: depot.name,
        repId,
        createdBy: repName(repId),
        createdAt: isoDate(-created),
        // Open quotations are still valid; closed ones closed after they were raised.
        closing: status === 'Converted' || status === 'Rejected' ? isoDate(-created + rng.int(7, 21)) : isoDate(rng.int(2, 18)),
        status,
        discount,
        lines,
        amount: documentTotal(lines, discount),
        notes: rng.pick(NOTES),
        orderId: status === 'Converted' ? `ORD-${(orderRef -= rng.int(3, 9))}` : undefined,
        submittedAt: status === 'Draft' ? null : `${isoDate(-created)}T${String(rng.int(8, 16)).padStart(2, '0')}:30:00.000Z`,
        decidedAt: decided ? `${isoDate(Math.min(0, -created + rng.int(1, 3)))}T10:00:00.000Z` : null,
        decidedBy: decided ? DEFAULT_APPROVER : null,
        rejectionReason: status === 'Rejected' ? rng.pick(REJECTION_REASONS) : null,
      });
      n -= 1;
    }
  }
  return list;
}

export function nextQuotationId(existing: readonly Quotation[]): string {
  const max = existing.reduce((m, q) => Math.max(m, Number(q.id.replace(/\D/g, '')) || 0), 157);
  return `QUO-${max + 1}`;
}
