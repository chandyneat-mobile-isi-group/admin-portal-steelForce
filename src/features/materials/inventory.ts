/**
 * Depot inventory and the category tree, as a local mock service.
 *
 * Seeded from `data/catalog.ts` and persisted, so an adjustment, a transfer or a new
 * category made on one screen is still there on the next and after a refresh. The
 * static exports in `catalog.ts` stay the seed (reports read them); the screens read
 * through here.
 */
import { createPersistentStore, mockDelay, mockId, mockResolve } from '@/services/mock';
import { sessionStore } from '@/infrastructure/storage/session-store';
import {
  WAREHOUSES,
  categories as seedCategories,
  movementsFor,
  products,
  stock as seedStock,
  type Category,
  type Movement,
  type MovementType,
  type Product,
  type StockRow,
} from './data/catalog';

const stockStore = createPersistentStore<StockRow[]>('materials.inventory', () => seedStock.map((r) => ({ ...r })));

/** Movements posted in the prototype, newest first, keyed by stock row. */
const movementStore = createPersistentStore<Record<string, Movement[]>>('materials.movements', () => ({}));

const categoryStore = createPersistentStore<Category[]>('materials.categories', () => seedCategories.map((c) => ({ ...c })));

/** Products re-homed by a category delete or move: productId → categoryId ('' = uncategorised). */
const productCategoryStore = createPersistentStore<Record<string, string>>('materials.product-categories', () => ({}));

function currentUser(): string {
  try {
    return sessionStore.read()?.user.name ?? 'Portal admin';
  } catch {
    return 'Portal admin';
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function warehouseName(id: string): string {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? id;
}

function post(rowId: string, type: MovementType, quantity: number, reference: string, note: string) {
  const entry: Movement = { id: mockId(`${rowId}-MV`), date: today(), type, quantity, reference, note, user: currentUser() };
  movementStore.update((all) => ({ ...all, [rowId]: [entry, ...(all[rowId] ?? [])] }));
}

function free(row: StockRow): number {
  return Math.max(0, row.available - row.reserved);
}

export const inventoryApi = {
  listStock: (signal?: AbortSignal) => mockResolve(stockStore.get(), signal),

  /** Posted movements first, then the generated history before them. */
  listMovements: (rowId: string, signal?: AbortSignal) => {
    const row = stockStore.get().find((r) => r.id === rowId);
    // The generator's quantities are sized for a ~250-unit line; scale to this one.
    const scale = row ? Math.max(row.reorderLevel, 1) / 250 : 1;
    return mockResolve([...(movementStore.get()[rowId] ?? []), ...movementsFor(rowId, scale)], signal, 150);
  },

  adjust: async (input: { rowId: string; quantity: number; reason: string }, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const row = stockStore.get().find((r) => r.id === input.rowId);
    if (!row) throw new Error('That stock record no longer exists.');
    if (row.available + input.quantity < 0) {
      throw new Error(`Only ${row.available.toLocaleString()} on hand — an adjustment cannot take stock below zero.`);
    }
    stockStore.update((rows) =>
      rows.map((r) =>
        r.id === input.rowId
          ? { ...r, available: r.available + input.quantity, reserved: Math.min(r.reserved, r.available + input.quantity), updatedAt: today() }
          : r
      )
    );
    const type: MovementType = input.reason === 'Goods received' ? 'Received' : input.reason === 'Customer return' ? 'Returned' : 'Adjusted';
    post(input.rowId, type, input.quantity, `ADJ-${String(Date.now()).slice(-5)}`, input.reason);
  },

  /**
   * Moves free stock (available less reserved) to another depot, creating the
   * destination record if the line was not carried there yet. Each source sends at most
   * what it has free; the total actually moved is returned.
   */
  transfer: async (input: { rowIds: string[]; toWarehouseId: string; quantity: number }, signal?: AbortSignal) => {
    await mockDelay(450, signal);
    const reference = `TRF-${String(Date.now()).slice(-4)}`;
    let moved = 0;
    let lines = 0;
    const posts: Array<[string, number, string]> = [];

    stockStore.update((rows) => {
      for (const id of input.rowIds) {
        const source = rows.find((r) => r.id === id);
        if (!source || source.warehouseId === input.toWarehouseId) continue;
        const qty = Math.min(input.quantity, free(source));
        if (qty <= 0) continue;
        source.available -= qty;
        source.updatedAt = today();

        const destId = `${source.productId}-${input.toWarehouseId}`;
        let dest = rows.find((r) => r.id === destId);
        if (!dest) {
          dest = { ...source, id: destId, warehouseId: input.toWarehouseId, available: 0, reserved: 0, onOrder: 0 };
          rows.push(dest);
        }
        dest.available += qty;
        dest.updatedAt = today();
        moved += qty;
        lines += 1;
        posts.push([source.id, -qty, `To ${warehouseName(input.toWarehouseId)}`]);
        posts.push([destId, qty, `From ${warehouseName(source.warehouseId)}`]);
      }
      return rows;
    });

    posts.forEach(([rowId, qty, note]) => post(rowId, 'Transferred', qty, reference, note));
    return { moved, lines, reference };
  },

  /** Reserves up to `quantity` of free stock on each row. */
  reserve: async (input: { rowIds: string[]; quantity: number }, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    let reserved = 0;
    let lines = 0;
    const posts: Array<[string, number]> = [];
    stockStore.update((rows) =>
      rows.map((r) => {
        if (!input.rowIds.includes(r.id)) return r;
        const qty = Math.min(input.quantity, free(r));
        if (qty <= 0) return r;
        reserved += qty;
        lines += 1;
        posts.push([r.id, qty]);
        return { ...r, reserved: r.reserved + qty, updatedAt: today() };
      })
    );
    posts.forEach(([rowId, qty]) => post(rowId, 'Reserved', -qty, `RSV-${String(Date.now()).slice(-4)}`, 'Held for a confirmed order'));
    return { reserved, lines };
  },
};

// ── Categories ──────────────────────────────────────────────────────────────

export interface CategoryNode extends Category {
  productCount: number;
  activeCount: number;
  revenue: number;
  stockValue: number;
  lowStock: number;
}

export interface CategoryTree {
  roots: Array<CategoryNode & { children: CategoryNode[] }>;
  products: Product[];
}

/** Products with any re-homing applied. */
function placedProducts(): Product[] {
  const moved = productCategoryStore.get();
  return products.map((p) => (p.id in moved ? { ...p, categoryId: moved[p.id] } : p));
}

function measure(category: Category, ids: Set<string>, list: Product[], stockRows: StockRow[]): CategoryNode {
  const inScope = list.filter((p) => ids.has(p.categoryId));
  const onHand = (id: string) => stockRows.filter((s) => s.productId === id).reduce((sum, s) => sum + s.available, 0);
  return {
    ...category,
    productCount: inScope.length,
    activeCount: inScope.filter((p) => p.status === 'Active').length,
    revenue: inScope.reduce((sum, p) => sum + p.price * p.soldYtd, 0),
    stockValue: inScope.reduce((sum, p) => sum + p.cost * onHand(p.id), 0),
    lowStock: inScope.filter((p) => p.status === 'Low Stock' || p.status === 'Out of Stock').length,
  };
}

export const categoriesApi = {
  /** The tree with each node's rollup measured against current stock. */
  tree: async (signal?: AbortSignal): Promise<CategoryTree> => {
    await mockDelay(undefined, signal);
    const all = categoryStore.get();
    const list = placedProducts();
    const stockRows = stockStore.get();
    const roots = all
      .filter((c) => c.parentId === null)
      .map((root) => {
        const children = all.filter((c) => c.parentId === root.id);
        const ids = new Set([root.id, ...children.map((c) => c.id)]);
        return {
          ...measure(root, ids, list, stockRows),
          children: children.map((c) => measure(c, new Set([c.id]), list, stockRows)),
        };
      });
    return { roots, products: list };
  },

  save: async (input: { id?: string; name: string; parentId: string | null; description: string }, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const name = input.name.trim();
    if (!name) throw new Error('A category name is required.');
    const all = categoryStore.get();
    if (all.some((c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A category called "${name}" already exists.`);
    }
    if (input.id && input.parentId && all.some((c) => c.parentId === input.id)) {
      throw new Error('This group has sub-categories, so it cannot itself become a sub-category.');
    }
    if (input.parentId === input.id) throw new Error('A category cannot be its own parent.');

    const record: Category = {
      id: input.id ?? mockId('CAT'),
      name,
      parentId: input.parentId || null,
      description: input.description.trim(),
    };
    categoryStore.update((rows) => (input.id ? rows.map((c) => (c.id === input.id ? record : c)) : [...rows, record]));
    return record;
  },

  /** Deletes a node and anything under it; its products become uncategorised. */
  remove: async (id: string, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const all = categoryStore.get();
    const doomed = new Set([id, ...all.filter((c) => c.parentId === id).map((c) => c.id)]);
    const orphaned = placedProducts().filter((p) => doomed.has(p.categoryId));
    categoryStore.set(all.filter((c) => !doomed.has(c.id)));
    productCategoryStore.update((map) => {
      orphaned.forEach((p) => (map[p.id] = ''));
      return map;
    });
    return { removed: doomed.size, productsMoved: orphaned.length };
  },
};
