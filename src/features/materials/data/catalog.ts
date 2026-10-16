import { makeRng } from '@/lib/utilities/random';
import { isoDate } from '@/lib/utilities/demo-clock';

/**
 * Product master, category tree and warehouse stock.
 *
 * One generator so a product's price, its category totals and its inventory
 * rows can never disagree — the categories page and the inventory page are
 * both derived views over `products` and `stock`.
 */

export const WAREHOUSES = [
  { id: 'WH-PP', name: 'Phnom Penh Central', province: 'Phnom Penh' },
  { id: 'WH-CCV', name: 'Chroy Changvar Yard', province: 'Phnom Penh' },
  { id: 'WH-TKM', name: 'Ta Khmau Depot', province: 'Kandal' },
  { id: 'WH-BB', name: 'Battambang Depot', province: 'Battambang' },
  { id: 'WH-SR', name: 'Siem Reap Depot', province: 'Siem Reap' },
] as const;

export const BRANDS = ['ISI Steel', 'ISI Roofing', 'ISI Pipe', 'Mekong Mills', 'Angkor Metal'] as const;
export const UNITS = ['tonne', 'piece', 'length', 'bag', 'sheet', 'roll'] as const;
export const PRODUCT_STATUSES = ['Active', 'Low Stock', 'Out of Stock', 'Discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
}

/** Two-level tree: four groups, fourteen leaves. */
export const categories: Category[] = [
  { id: 'CAT-STL', name: 'Steel Products', parentId: null, description: 'Reinforcement, sections and long products' },
  { id: 'CAT-STL-RB', name: 'Rebar', parentId: 'CAT-STL', description: 'Deformed and round reinforcement bar' },
  { id: 'CAT-STL-WR', name: 'Wire Rod', parentId: 'CAT-STL', description: 'Coiled wire rod for drawing and mesh' },
  { id: 'CAT-STL-ST', name: 'Structural Steel', parentId: 'CAT-STL', description: 'Angle, channel, beam and plate' },
  { id: 'CAT-STL-PI', name: 'Steel Pipe', parentId: 'CAT-STL', description: 'Black and galvanised pipe' },

  { id: 'CAT-CON', name: 'Construction Materials', parentId: null, description: 'Site consumables and finishing' },
  { id: 'CAT-CON-CE', name: 'Cement', parentId: 'CAT-CON', description: 'OPC and blended cement' },
  { id: 'CAT-CON-RF', name: 'Roofing', parentId: 'CAT-CON', description: 'Zinc, colour-coated and translucent sheet' },
  { id: 'CAT-CON-AC', name: 'Accessories', parentId: 'CAT-CON', description: 'Fixings, sealant and trim' },

  { id: 'CAT-FAB', name: 'Fabrication', parentId: null, description: 'Cut, bend and welded products' },
  { id: 'CAT-FAB-ME', name: 'Wire Mesh', parentId: 'CAT-FAB', description: 'Welded mesh sheets and rolls' },
  { id: 'CAT-FAB-CB', name: 'Cut & Bend', parentId: 'CAT-FAB', description: 'Prefabricated reinforcement cages' },

  { id: 'CAT-HRD', name: 'Hardware', parentId: null, description: 'Tools and general hardware lines' },
  { id: 'CAT-HRD-TL', name: 'Hand Tools', parentId: 'CAT-HRD', description: 'Site hand tools' },
  { id: 'CAT-HRD-FX', name: 'Fixings', parentId: 'CAT-HRD', description: 'Bolts, nuts and anchors' },
];

export const leafCategories = categories.filter((c) => c.parentId !== null);
export const rootCategories = categories.filter((c) => c.parentId === null);

export function childrenOf(id: string): Category[] {
  return categories.filter((c) => c.parentId === id);
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  brand: string;
  unit: string;
  price: number;
  cost: number;
  status: ProductStatus;
  description: string;
  specs: Array<{ label: string; value: string }>;
  updatedAt: string;
  /** Units sold over the trailing twelve months. */
  soldYtd: number;
  hue: number;
}

/** Product name parts per leaf category, so codes and names stay plausible. */
const CATALOG_SPECS: Record<string, { prefix: string; variants: string[]; unit: string; low: number; high: number }> = {
  'CAT-STL-RB': { prefix: 'RB', variants: ['Deformed Bar D10', 'Deformed Bar D12', 'Deformed Bar D16', 'Deformed Bar D20', 'Deformed Bar D25', 'Round Bar R6', 'Round Bar R9'], unit: 'tonne', low: 620, high: 780 },
  'CAT-STL-WR': { prefix: 'WR', variants: ['Wire Rod 5.5mm', 'Wire Rod 6.5mm', 'Wire Rod 8mm'], unit: 'tonne', low: 580, high: 690 },
  'CAT-STL-ST': { prefix: 'ST', variants: ['Equal Angle 40×40', 'Equal Angle 50×50', 'Equal Angle 75×75', 'C-Channel 100', 'H-Beam 150', 'MS Plate 3mm', 'MS Plate 6mm'], unit: 'tonne', low: 700, high: 940 },
  'CAT-STL-PI': { prefix: 'PI', variants: ['Black Pipe 1"', 'Black Pipe 2"', 'GI Pipe 1"', 'GI Pipe 2"', 'Square Tube 40×40'], unit: 'length', low: 9, high: 34 },
  'CAT-CON-CE': { prefix: 'CE', variants: ['OPC Cement 50kg', 'Blended Cement 50kg', 'Rapid Set Cement 50kg'], unit: 'bag', low: 5, high: 9 },
  'CAT-CON-RF': { prefix: 'RF', variants: ['Zinc Sheet 0.30mm', 'Zinc Sheet 0.40mm', 'Colour Roof Blue 0.35mm', 'Colour Roof Red 0.35mm', 'Translucent Sheet'], unit: 'sheet', low: 6, high: 22 },
  'CAT-CON-AC': { prefix: 'AC', variants: ['Roofing Screw 65mm', 'Ridge Cap', 'Silicone Sealant', 'Foam Closure Strip'], unit: 'piece', low: 1, high: 12 },
  'CAT-FAB-ME': { prefix: 'ME', variants: ['Welded Mesh 6mm', 'Welded Mesh 8mm', 'Mesh Roll 4mm'], unit: 'sheet', low: 18, high: 62 },
  'CAT-FAB-CB': { prefix: 'CB', variants: ['Column Cage 300×300', 'Beam Cage 250×500', 'Pile Cage 600'], unit: 'piece', low: 85, high: 340 },
  'CAT-HRD-TL': { prefix: 'TL', variants: ['Bar Cutter 16mm', 'Bar Bender', 'Steel Trowel', 'Spirit Level 1200'], unit: 'piece', low: 8, high: 180 },
  'CAT-HRD-FX': { prefix: 'FX', variants: ['Anchor Bolt M12', 'Hex Bolt M16', 'Chemical Anchor 300ml', 'Wire Tie 1kg'], unit: 'piece', low: 1, high: 26 },
};

function buildProducts(): Product[] {
  const rng = makeRng(770231);
  const list: Product[] = [];
  let n = 0;

  for (const [categoryId, spec] of Object.entries(CATALOG_SPECS)) {
    spec.variants.forEach((variant) => {
      n += 1;
      const price = Number(rng.float(spec.low, spec.high).toFixed(2));
      const status = rng.weighted<ProductStatus>([
        ['Active', 11],
        ['Low Stock', 3],
        ['Out of Stock', 1],
        ['Discontinued', 1],
      ]);
      list.push({
        id: `PRD-${String(n).padStart(3, '0')}`,
        code: `${spec.prefix}-${String(1000 + n * 7)}`,
        name: variant,
        categoryId,
        brand: rng.pick(BRANDS),
        unit: spec.unit,
        price,
        cost: Number((price * rng.float(0.68, 0.85)).toFixed(2)),
        status,
        description: `${variant} supplied to ISI specification. Certified mill test report available on request for every batch.`,
        specs: [
          { label: 'Grade', value: rng.pick(['SD390', 'SD490', 'Q235B', 'G550', 'OPC 42.5N']) },
          { label: 'Standard', value: rng.pick(['JIS G3112', 'ASTM A615', 'BS 4449', 'AS 1397']) },
          { label: 'Length / size', value: rng.pick(['6 m', '9 m', '12 m', '1220 × 2440 mm', '50 kg']) },
          { label: 'Finish', value: rng.pick(['Mill', 'Galvanised', 'Colour-coated', 'Black']) },
          { label: 'Origin', value: rng.pick(['Cambodia', 'Vietnam', 'Thailand']) },
        ],
        updatedAt: isoDate(-rng.int(0, 40)),
        soldYtd: rng.int(40, 4200),
        hue: (n * 41) % 360,
      });
    });
  }
  return list;
}

export const products: Product[] = buildProducts();
export const productById: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.id, p])
);

export function categoryName(id: string): string {
  return categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
}

export function categoryPath(id: string): string {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return 'Uncategorised';
  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}

// ── Inventory ───────────────────────────────────────────────────────────────

export const STOCK_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'On Order'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export interface StockRow {
  id: string;
  productId: string;
  warehouseId: string;
  available: number;
  reserved: number;
  onOrder: number;
  reorderLevel: number;
  updatedAt: string;
}

/**
 * Reorder level range per category, in the product's own unit — a depot keeps tens of
 * tonnes of rebar but hundreds of bags of cement and a handful of reinforcement cages.
 */
const REORDER_RANGE: Record<string, [number, number]> = {
  'CAT-STL-RB': [25, 90],
  'CAT-STL-WR': [15, 60],
  'CAT-STL-ST': [10, 45],
  'CAT-STL-PI': [80, 320],
  'CAT-CON-CE': [300, 1200],
  'CAT-CON-RF': [150, 600],
  'CAT-CON-AC': [200, 900],
  'CAT-FAB-ME': [40, 160],
  'CAT-FAB-CB': [4, 20],
  'CAT-HRD-TL': [6, 30],
  'CAT-HRD-FX': [150, 700],
};

/** Phnom Penh Central carries the most; the provincial depots carry less. */
const DEPOT_SCALE: Record<string, number> = {
  'WH-PP': 1.4,
  'WH-CCV': 1,
  'WH-TKM': 0.85,
  'WH-BB': 0.6,
  'WH-SR': 0.55,
};

function buildStock(): StockRow[] {
  const rng = makeRng(315088);
  const rows: StockRow[] = [];
  for (const product of products) {
    // Not every line is carried at every depot — that is what makes the
    // warehouse filter meaningful.
    for (const wh of WAREHOUSES) {
      if (!rng.chance(0.72)) continue;
      const [minLevel, maxLevel] = REORDER_RANGE[product.categoryId] ?? [20, 260];
      const reorderLevel = Math.max(2, Math.round(rng.int(minLevel, maxLevel) * (DEPOT_SCALE[wh.id] ?? 1)));
      const outOfStock = product.status === 'Out of Stock' && rng.chance(0.6);
      const low = product.status === 'Low Stock';
      const available = outOfStock
        ? 0
        : low
          ? rng.int(1, reorderLevel)
          : rng.int(reorderLevel, reorderLevel * 5);
      rows.push({
        id: `${product.id}-${wh.id}`,
        productId: product.id,
        warehouseId: wh.id,
        available,
        reserved: Math.round(available * rng.float(0, 0.28)),
        // Replenishment orders are sized against the reorder level, not a fixed band.
        onOrder: rng.chance(available === 0 ? 0.5 : 0.3) ? Math.round(reorderLevel * rng.float(1.5, 4)) : 0,
        reorderLevel,
        updatedAt: isoDate(-rng.int(0, 9)),
      });
    }
  }
  return rows;
}

export const stock: StockRow[] = buildStock();

export function stockStatus(row: StockRow): StockStatus {
  if (row.available === 0) return row.onOrder > 0 ? 'On Order' : 'Out of Stock';
  if (row.available <= row.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

/** Total units of a product across every warehouse. */
export function totalAvailable(productId: string): number {
  return stock
    .filter((s) => s.productId === productId)
    .reduce((sum, s) => sum + s.available, 0);
}

export interface CategoryRollup {
  category: Category;
  children: Category[];
  productCount: number;
  activeCount: number;
  revenue: number;
  stockValue: number;
  lowStock: number;
}

/** Aggregates a root category and everything beneath it. */
export function categoryRollup(root: Category): CategoryRollup {
  const children = childrenOf(root.id);
  const ids = new Set([root.id, ...children.map((c) => c.id)]);
  const inScope = products.filter((p) => ids.has(p.categoryId));

  return {
    category: root,
    children,
    productCount: inScope.length,
    activeCount: inScope.filter((p) => p.status === 'Active').length,
    revenue: inScope.reduce((sum, p) => sum + p.price * p.soldYtd, 0),
    stockValue: inScope.reduce((sum, p) => sum + p.cost * totalAvailable(p.id), 0),
    lowStock: inScope.filter((p) => p.status === 'Low Stock' || p.status === 'Out of Stock').length,
  };
}

export function leafRollup(leaf: Category) {
  const inScope = products.filter((p) => p.categoryId === leaf.id);
  return {
    productCount: inScope.length,
    activeCount: inScope.filter((p) => p.status === 'Active').length,
    revenue: inScope.reduce((sum, p) => sum + p.price * p.soldYtd, 0),
    stockValue: inScope.reduce((sum, p) => sum + p.cost * totalAvailable(p.id), 0),
    lowStock: inScope.filter((p) => p.status === 'Low Stock' || p.status === 'Out of Stock').length,
  };
}

// ── Stock movement (inventory detail timeline) ──────────────────────────────

export const MOVEMENT_TYPES = ['Received', 'Reserved', 'Sold', 'Transferred', 'Adjusted', 'Returned'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface Movement {
  id: string;
  date: string;
  type: MovementType;
  quantity: number;
  reference: string;
  note: string;
  user: string;
}

const MOVEMENT_NOTES: Record<MovementType, string> = {
  Received: 'Depot replenishment from mill',
  Reserved: 'Allocated to a confirmed order',
  Sold: 'Delivered against sales order',
  Transferred: 'Inter-depot balance transfer',
  Adjusted: 'Cycle count correction',
  Returned: 'Customer return, stock re-graded',
};

/** `scale` sizes the generated quantities to the line — tonnes of rebar, not thousands. */
export function movementsFor(stockRowId: string, scale = 1): Movement[] {
  const seed = stockRowId.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) * 53;
  const rng = makeRng(seed);
  const users = ['Sok Dara', 'Chan Sopheak', 'Heng Kanha', 'Vann Rithy', 'Keo Malis'];

  return Array.from({ length: 7 }, (_, i) => {
    const type = rng.pick(MOVEMENT_TYPES);
    const inbound = type === 'Received' || type === 'Returned';
    return {
      id: `${stockRowId}-MV-${i}`,
      date: isoDate(-(i * rng.int(1, 5) + rng.int(0, 2))),
      type,
      quantity: (inbound ? 1 : -1) * Math.max(1, Math.round(rng.int(10, 480) * scale)),
      reference:
        type === 'Sold'
          ? `SO-${26000 + rng.int(100, 999)}`
          : type === 'Received'
            ? `GRN-${8000 + rng.int(100, 999)}`
            : type === 'Transferred'
              ? `TRF-${400 + rng.int(10, 99)}`
              : `ADJ-${200 + rng.int(10, 99)}`,
      note: MOVEMENT_NOTES[type],
      user: rng.pick(users),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
