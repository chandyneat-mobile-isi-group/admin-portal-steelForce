/**
 * React Query bindings for materials and the SAP syncs.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryParams } from '@/services/mock';
import { materialsApi, type MaterialListQuery } from './api';
import { categoriesApi, inventoryApi } from './inventory';

export const materialKeys = {
  all: ['materials'] as const,
  materials: (q: MaterialListQuery) => [...materialKeys.all, 'materials', q] as const,
  material: (id: string) => [...materialKeys.all, 'material', id] as const,
  references: (path: string) => [...materialKeys.all, 'references', path] as const,
  syncStatus: () => [...materialKeys.all, 'sync-status'] as const,
  inventory: () => [...materialKeys.all, 'inventory'] as const,
  movements: (rowId: string) => [...materialKeys.all, 'inventory', 'movements', rowId] as const,
  categories: () => [...materialKeys.all, 'categories'] as const,
  stockDetail: (q: QueryParams) => [...materialKeys.all, 'stock-detail', q] as const,
};

export const productKeys = materialKeys;

/** The local master. Paged in the mock service, as the server paged it. */
export function useMaterials(query: MaterialListQuery = {}) {
  return useQuery({
    queryKey: materialKeys.materials(query),
    queryFn: ({ signal }) => materialsApi.listMaterials(query, signal),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useMaterial(materialId: string | null) {
  return useQuery({
    queryKey: materialKeys.material(materialId ?? ''),
    queryFn: ({ signal }) => materialsApi.getMaterial(materialId!, signal),
    enabled: Boolean(materialId),
    staleTime: 5 * 60_000,
  });
}

/** One reference catalogue. Cached hard: these change only when SAP is re-synced. */
export function useMaterialReferences(path: string, enabled = true) {
  return useQuery({
    queryKey: materialKeys.references(path),
    queryFn: ({ signal }) => materialsApi.listReferences(path, signal),
    enabled,
    staleTime: 30 * 60_000,
  });
}

/**
 * Live batch stock from SAP.
 *
 * `retry: false` on purpose. When SAP is unreachable each attempt burns the full
 * timeout, so the default retries turn a twenty-second wait into a minute before the
 * screen admits anything is wrong.
 */
export function useStockDetail(query: QueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: materialKeys.stockDetail(query),
    queryFn: ({ signal }) => materialsApi.listStockDetail(query, signal),
    enabled,
    retry: false,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** Queues all three syncs. Returns job ids, not counts. */
export function useSyncAll() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => materialsApi.syncAll(),
    // The jobs run in the background, so there is nothing to refetch yet. Invalidating
    // here would show the same pre-sync numbers and imply the refresh had finished.
    onSuccess: () => {
      client.invalidateQueries({ queryKey: materialKeys.all, refetchType: 'none' });
      // The prototype's background jobs finish in seconds; refetch once they have.
      setTimeout(() => client.invalidateQueries({ queryKey: materialKeys.all }), 7_500);
    },
  });
}

/** When each sync last finished. */
export function useSyncStatus() {
  return useQuery({
    queryKey: materialKeys.syncStatus(),
    queryFn: ({ signal }) => materialsApi.getSyncStatus(signal),
  });
}

/** Runs one sync and waits for its counts. */
export function useSyncOne() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ kind, maximumPages }: { kind: 'materials' | 'stock' | 'references'; maximumPages?: number }) => {
      if (kind === 'materials') return materialsApi.syncMaterials(maximumPages);
      if (kind === 'stock') return materialsApi.syncStock(maximumPages);
      return materialsApi.syncReferences();
    },
    onSettled: () => client.invalidateQueries({ queryKey: materialKeys.all }),
  });
}

// --- Inventory ---------------------------------------------------------------

/** Every depot stock record. Small enough to filter and page in the browser. */
export function useInventory() {
  return useQuery({
    queryKey: materialKeys.inventory(),
    queryFn: ({ signal }) => inventoryApi.listStock(signal),
  });
}

export function useStockMovements(rowId: string | null) {
  return useQuery({
    queryKey: materialKeys.movements(rowId ?? ''),
    queryFn: ({ signal }) => inventoryApi.listMovements(rowId!, signal),
    enabled: Boolean(rowId),
  });
}

/** Adjust, transfer and reserve all move stock, so all three refresh the same views. */
function useInventoryMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: materialKeys.inventory() });
      client.invalidateQueries({ queryKey: materialKeys.categories() });
    },
  });
}

export const useAdjustStock = () => useInventoryMutation((input: Parameters<typeof inventoryApi.adjust>[0]) => inventoryApi.adjust(input));
export const useTransferStock = () => useInventoryMutation((input: Parameters<typeof inventoryApi.transfer>[0]) => inventoryApi.transfer(input));
export const useReserveStock = () => useInventoryMutation((input: Parameters<typeof inventoryApi.reserve>[0]) => inventoryApi.reserve(input));

// --- Categories --------------------------------------------------------------

export function useCategoryTree() {
  return useQuery({
    queryKey: materialKeys.categories(),
    queryFn: ({ signal }) => categoriesApi.tree(signal),
  });
}

export function useSaveCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof categoriesApi.save>[0]) => categoriesApi.save(input),
    onSuccess: () => client.invalidateQueries({ queryKey: materialKeys.categories() }),
  });
}

export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: materialKeys.categories() }),
  });
}
