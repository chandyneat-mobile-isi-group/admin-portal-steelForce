/**
 * The materials module's service boundary — mock of `MaterialsController`.
 *
 * ## Two kinds of read, and the difference matters
 *
 * **Cached reads** hit the platform's own copy, filled by the SAP syncs: the material
 * master and the five reference catalogues. In the prototype that copy is a persisted
 * local store, so a sync that brings in new materials is still visible after a refresh.
 *
 * **Live reads** stand for calls that go through to SAP on every request — batch-level
 * stock detail. They are slower here too, so the screens still show what waiting on SAP
 * feels like.
 *
 * Mixing the two on one screen without saying which is which is how somebody reads a
 * cached band as a live quantity and promises stock that is not there.
 */
import { z } from 'zod';
import {
  createPersistentStore,
  mockDelay,
  mockId,
  mockResolve,
  paginate,
  type QueryParams,
} from '@/services/mock';
import {
  MATERIAL_GROUPS,
  MATERIAL_TYPES,
  PENDING_PLANT,
  PLANTS,
  PRICE_GROUPS,
  STORAGE_LOCATIONS,
  buildStockDetail,
  sapMaster,
  seedMaterials,
  type MaterialRecord,
  type ReferenceRecord,
} from './data/sap-master';

/** How long a live SAP read takes in the prototype. */
const SAP_LATENCY_MS = 900;

export const MaterialSchema = z.object({
  id: z.string(),
  material: z.string(),
  name: z.string(),
  materialName: z.string().nullable().optional(),
  materialKhName: z.string().nullable().optional(),
  materialType: z.string().nullable().optional(),
  materialTypeName: z.string().nullable().optional(),
  materialGroup: z.string().nullable().optional(),
  materialGroupName: z.string().nullable().optional(),
  baseUnit: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  isBlocked: z.boolean().default(false),
});

/** A row of any of the five reference catalogues — they share one shape. */
export const MaterialReferenceSchema = z.object({
  code: z.string(),
  name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  plant: z.string().nullable().optional(),
});

export const StockDetailSchema = z
  .object({
    material: z.string(),
    materialName: z.string().nullable().optional(),
    plant: z.string().nullable().optional(),
    storageLocation: z.string().nullable().optional(),
    batch: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
  })
  .passthrough();

/** What a synchronous sync reports when it finishes. */
export const SyncSummarySchema = z.object({
  success: z.boolean().default(false),
  inserted: z.number().default(0),
  updated: z.number().default(0),
  skipped: z.number().default(0),
  removed: z.number().optional(),
  total: z.number().default(0),
  sapTotalCount: z.number().optional(),
  isPartial: z.boolean().optional(),
  capturedAt: z.string().optional(),
  durationMs: z.number().default(0),
});

/** What `sync-all` returns — job ids, not counts. The work has not happened yet. */
export const SyncQueuedSchema = z.object({
  referencesJobId: z.string(),
  materialsJobId: z.string(),
  stockJobId: z.string(),
  message: z.string(),
});

export type MaterialDto = z.infer<typeof MaterialSchema>;
export type MaterialReferenceDto = z.infer<typeof MaterialReferenceSchema>;
export type StockDetailDto = z.infer<typeof StockDetailSchema>;
export type SyncSummaryDto = z.infer<typeof SyncSummarySchema>;
export type SyncQueuedDto = z.infer<typeof SyncQueuedSchema>;

/** The five SAP reference catalogues, in the order the Categories screen lists them. */
export const REFERENCE_KINDS = [
  { key: 'types', label: 'Material types', path: 'types' },
  { key: 'groups', label: 'Material groups', path: 'groups' },
  { key: 'price-groups', label: 'Price groups', path: 'price-groups' },
  { key: 'plants', label: 'Plants', path: 'plants' },
  { key: 'storage-locations', label: 'Storage locations', path: 'storage-locations' },
] as const;

export type ReferenceKind = (typeof REFERENCE_KINDS)[number]['key'];

export interface MaterialListQuery extends QueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  materialType?: string;
  materialGroup?: string;
}

// --- The platform's copy --------------------------------------------------

const materialsStore = createPersistentStore<MaterialRecord[]>('materials.master', seedMaterials);

const referencesStore = createPersistentStore<Record<string, ReferenceRecord[]>>('materials.references', () => ({
  types: MATERIAL_TYPES,
  groups: MATERIAL_GROUPS,
  'price-groups': PRICE_GROUPS,
  plants: PLANTS.filter((p) => p.code !== PENDING_PLANT).map(({ code, name, category, plant }) => ({ code, name, category, plant })),
  'storage-locations': STORAGE_LOCATIONS.filter((l) => l.plant !== PENDING_PLANT),
}));

export interface SyncStatus {
  /** ISO timestamps of the last completed run of each sync. */
  materials: string | null;
  stock: string | null;
  references: string | null;
  /** Bumped by every stock sync; the batch positions are generated from it. */
  stockRevision: number;
}

const syncStore = createPersistentStore<SyncStatus>('materials.sync', () => ({
  materials: '2026-10-16T02:31:00Z',
  stock: '2026-10-16T08:00:00Z',
  references: '2026-10-12T02:30:00Z',
  stockRevision: 0,
}));

function stockDetail() {
  return buildStockDetail(materialsStore.get(), referencesStore.get().plants, syncStore.get().stockRevision);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toDto(m: MaterialRecord): MaterialDto {
  return {
    id: m.id,
    material: m.material,
    name: m.name,
    materialName: m.materialName,
    materialKhName: m.materialKhName,
    materialType: m.materialType,
    materialTypeName: m.materialTypeName,
    materialGroup: m.materialGroup,
    materialGroupName: m.materialGroupName,
    baseUnit: m.baseUnit,
    brand: m.brand,
    isBlocked: m.isBlocked,
  };
}

// --- Sync runs --------------------------------------------------------------

async function runReferencesSync(signal?: AbortSignal): Promise<SyncSummaryDto> {
  const started = Date.now();
  await mockDelay(1400, signal);

  const current = referencesStore.get();
  const sap: Record<string, ReferenceRecord[]> = {
    types: MATERIAL_TYPES,
    groups: MATERIAL_GROUPS,
    'price-groups': PRICE_GROUPS,
    plants: PLANTS.map(({ code, name, category, plant }) => ({ code, name, category, plant })),
    'storage-locations': STORAGE_LOCATIONS,
  };

  let inserted = 0;
  let updated = 0;
  for (const [kind, rows] of Object.entries(sap)) {
    const known = new Set((current[kind] ?? []).map((r) => `${r.plant ?? ''}/${r.code}`));
    rows.forEach((r) => (known.has(`${r.plant ?? ''}/${r.code}`) ? (updated += 1) : (inserted += 1)));
  }
  referencesStore.set(sap);

  const now = new Date().toISOString();
  syncStore.update((s) => ({ ...s, references: now }));
  const total = inserted + updated;
  return { success: true, inserted, updated, skipped: 0, removed: 0, total, sapTotalCount: total, capturedAt: now, durationMs: Date.now() - started };
}

async function runMaterialsSync(maximumPages: number | undefined, signal?: AbortSignal): Promise<SyncSummaryDto> {
  const started = Date.now();
  // Compressed from the real four minutes, but long enough to feel like a held request.
  await mockDelay(3200, signal);

  const now = new Date().toISOString();
  // SAP pages are 100 rows; a capped run reads only that many and says so.
  const limit = maximumPages ? maximumPages * 100 : Infinity;
  const read = sapMaster.slice(0, limit);
  const existing = new Map(materialsStore.get().map((m) => [m.material, m]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const m of read) {
    const local = existing.get(m.material);
    if (local) {
      // SAP is the master: its descriptions and block flag win over the copy.
      existing.set(m.material, { ...local, ...m, synchronisedAt: now });
      updated += 1;
    } else if (!m.materialName) {
      skipped += 1;
    } else {
      existing.set(m.material, { ...m, changedOn: now.slice(0, 10), synchronisedAt: now });
      inserted += 1;
    }
  }
  materialsStore.set(Array.from(existing.values()).sort((a, b) => a.material.localeCompare(b.material)));

  const isPartial = read.length < sapMaster.length;
  if (!isPartial) syncStore.update((s) => ({ ...s, materials: now }));

  return {
    success: true,
    inserted,
    updated,
    skipped,
    removed: 0,
    total: read.length,
    sapTotalCount: sapMaster.length,
    isPartial,
    capturedAt: now,
    durationMs: Date.now() - started,
  };
}

async function runStockSync(maximumPages: number | undefined, signal?: AbortSignal): Promise<SyncSummaryDto> {
  const started = Date.now();
  await mockDelay(2200, signal);

  const before = stockDetail();
  const next = buildStockDetail(materialsStore.get(), referencesStore.get().plants, syncStore.get().stockRevision + 1);
  const total = next.length;

  // A capped run would be partial, and a partial snapshot is refused rather than imported.
  if (maximumPages && maximumPages * 500 < total) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: total,
      total: maximumPages * 500,
      sapTotalCount: total,
      isPartial: true,
      durationMs: Date.now() - started,
    };
  }

  const now = new Date().toISOString();
  syncStore.update((s) => ({ ...s, stock: now, stockRevision: s.stockRevision + 1 }));
  const kept = new Set(before.map((r) => `${r.material}/${r.plant}/${r.batch}`));
  const updated = next.filter((r) => kept.has(`${r.material}/${r.plant}/${r.batch}`)).length;

  return {
    success: true,
    inserted: total - updated,
    updated,
    skipped: 0,
    removed: before.length - updated,
    total,
    sapTotalCount: total,
    isPartial: false,
    capturedAt: now,
    durationMs: Date.now() - started,
  };
}

export const materialsApi = {
  // --- Cached: the platform's own copy -------------------------------------

  /** Pages the material master held locally. */
  listMaterials: async (query: MaterialListQuery = {}, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    const search = text(query.search)?.toLowerCase();
    const type = text(query.materialType);
    const group = text(query.materialGroup);

    const rows = materialsStore.get().filter((m) => {
      if (type && m.materialType !== type) return false;
      if (group && m.materialGroup !== group) return false;
      if (search) {
        const haystack = `${m.material} ${m.name} ${m.materialKhName ?? ''} ${m.brand ?? ''} ${m.materialGroupName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const page = paginate(rows, Number(query.pageNumber ?? 1), Number(query.pageSize ?? 50));
    return { items: page.items.map(toDto), totalCount: page.total };
  },

  /** One material's full record. */
  getMaterial: async (materialId: string, signal?: AbortSignal) => {
    const record = materialsStore.get().find((m) => m.id === materialId || m.material === materialId);
    if (!record) {
      await mockDelay(undefined, signal);
      throw new Error(`Material ${materialId} was not found.`);
    }
    const positions = stockDetail().filter((r) => r.material === record.material);
    return mockResolve<Record<string, unknown>>(
      {
        ...record,
        plants: Array.from(new Set(positions.map((p) => p.plant))),
        totalStock: positions.reduce((sum, p) => sum + p.quantity, 0),
      },
      signal
    );
  },

  /** One of the five reference catalogues. */
  listReferences: async (path: string, signal?: AbortSignal) => {
    const rows = referencesStore.get()[path];
    if (!rows) {
      await mockDelay(undefined, signal);
      throw new Error(`Unknown reference catalogue "${path}".`);
    }
    return mockResolve(rows, signal);
  },

  // --- Live: straight through to SAP ---------------------------------------

  /**
   * Batch-level stock, as SAP would report it.
   *
   * **Detail rows sum to the cached summary, so the two must never be added together.**
   */
  listStockDetail: async (query: QueryParams = {}, signal?: AbortSignal) => {
    await mockDelay(SAP_LATENCY_MS, signal);
    const material = text(query.material);
    const plant = text(query.plant);
    const location = text(query.storageLocation);
    const search = text(query.search)?.toLowerCase();

    const rows = stockDetail().filter((r) => {
      if (material && r.material !== material) return false;
      if (plant && r.plant !== plant) return false;
      if (location && r.storageLocation !== location) return false;
      if (search && !`${r.material} ${r.materialName ?? ''} ${r.batch}`.toLowerCase().includes(search)) return false;
      return true;
    });

    const page = paginate(rows, Number(query.pageNumber ?? 1), Number(query.pageSize ?? 50));
    return { items: z.array(StockDetailSchema).parse(page.items), totalCount: page.total };
  },

  /** When each sync last completed — what the screens are "as current as". */
  getSyncStatus: async (signal?: AbortSignal) => mockResolve(syncStore.get(), signal, 120),

  // --- Synchronisation ------------------------------------------------------

  /**
   * Refreshes everything, in the background.
   *
   * Returns three job ids and no counts — the work has been accepted, not done. The
   * prototype then runs the three syncs in dependency order behind the screen, so a
   * reload a little later shows the refreshed copy.
   */
  syncAll: async (signal?: AbortSignal) => {
    await mockDelay(500, signal);
    const queued: SyncQueuedDto = {
      referencesJobId: mockId('job-ref'),
      materialsJobId: mockId('job-mat'),
      stockJobId: mockId('job-stk'),
      message: 'References, materials and stock queued in dependency order.',
    };
    void runReferencesSync()
      .then(() => runMaterialsSync(undefined))
      .then(() => runStockSync(undefined))
      .catch(() => undefined);
    return queued;
  },

  /** Pulls the material master and reconciles it on the material number. */
  syncMaterials: (maximumPages: number | undefined, signal?: AbortSignal) => runMaterialsSync(maximumPages, signal),

  /** Pulls the stock snapshot. A partial read is refused rather than imported. */
  syncStock: (maximumPages: number | undefined, signal?: AbortSignal) => runStockSync(maximumPages, signal),

  /** Pulls the five reference catalogues. Seconds, not minutes. */
  syncReferences: (signal?: AbortSignal) => runReferencesSync(signal),
};

export const productsApi = materialsApi;
