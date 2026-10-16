import { crmDepots, crmDepotById, type CrmDepot } from '@/features/depots/data/crm';
import { salesReps } from '@/features/planning/data/demo-data';
import { products, productById, type Product } from '@/features/materials/data/catalog';
import type { makeRng } from '@/lib/utilities/random';

/**
 * Line items shared by orders and quotations.
 *
 * Both documents reference the same depot master (`features/depots/data/crm`),
 * rep directory (`features/planning`) and material catalogue
 * (`features/materials`), so a depot opened from an order is the same record
 * the Depots screen shows and every SKU exists in Materials.
 */

export interface DocumentLine {
  productId: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

type Rng = ReturnType<typeof makeRng>;

/** Products that can still be sold. */
export const sellableProducts: Product[] = products.filter((p) => p.status !== 'Discontinued');

/** Trading accounts an order or quotation can be raised against. */
export const tradingDepots: CrmDepot[] = crmDepots.filter((d) => d.status !== 'Inactive');

const QTY_BY_UNIT: Record<string, [number, number]> = {
  tonne: [2, 36],
  length: [20, 320],
  bag: [100, 1400],
  sheet: [40, 600],
  piece: [10, 240],
  roll: [5, 60],
};

export function lineFor(product: Product, qty: number, unitPrice = product.price): DocumentLine {
  return {
    productId: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    qty,
    unitPrice,
  };
}

export function randomLines(rng: Rng, min = 1, max = 5): DocumentLine[] {
  const count = rng.int(min, max);
  const chosen = new Set<string>();
  const lines: DocumentLine[] = [];
  while (lines.length < count) {
    const product = rng.pick(sellableProducts);
    if (chosen.has(product.id)) continue;
    chosen.add(product.id);
    const [lo, hi] = QTY_BY_UNIT[product.unit] ?? [10, 100];
    lines.push(lineFor(product, rng.int(lo, hi)));
  }
  return lines;
}

export function subtotal(lines: readonly DocumentLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
}

/** Net of the header discount, rounded to cents. */
export function documentTotal(lines: readonly DocumentLine[], discountPct: number): number {
  return Math.round(subtotal(lines) * (1 - discountPct / 100) * 100) / 100;
}

export function depotName(depotId: string): string {
  return crmDepotById[depotId]?.name ?? 'Unknown depot';
}

export function repName(repId: string): string {
  return salesReps.find((r) => r.id === repId)?.name ?? 'Unassigned';
}

export function productLabel(productId: string): string {
  const p = productById[productId];
  return p ? `${p.code} · ${p.name}` : productId;
}

export { productById, salesReps };

/**
 * The rep who raised a document: usually the depot's account owner, otherwise
 * another rep covering the same province.
 */
export function repForDepot(rng: Rng, depot: CrmDepot): string {
  if (rng.chance(0.5)) return depot.repId;
  const local = salesReps.filter((r) => r.province === depot.province && r.status !== 'Offline');
  return local.length ? rng.pick(local).id : depot.repId;
}
