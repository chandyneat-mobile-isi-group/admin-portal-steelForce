/**
 * React Query bindings for promotions.
 *
 * Every mutation invalidates the list as well as the promotion it acted on: a transition
 * changes the open version's status, which is what the catalogue and the approval queue
 * are filtered by, so patching only the detail leaves both lists showing a decision that
 * has already been taken.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionsApi, type CreatePromotionInput } from './api';
import {
  promotionCatalogApi,
  type ConditionDefinitionInput,
  type ConditionValueDto,
  type PromotionTypeInput,
} from './catalog-api';

/** The filters the catalogue list and the spreadsheet export share. */
export interface PromotionQuery {
  status?: string;
  businessType?: string;
  sapStatus?: string;
  search?: string;
  dimension?: string;
  value?: string;
  pageSize?: number;
}

export const promotionKeys = {
  all: ['promotions'] as const,
  list: (query: object) => [...promotionKeys.all, 'list', query] as const,
  detail: (id: string) => [...promotionKeys.all, 'detail', id] as const,
  categoryMappings: () => [...promotionKeys.all, 'category-mappings'] as const,
  // The catalogue sits outside `all` so a promotion edit does not refetch it, while a
  // type rename (which list rows display) invalidates both explicitly.
  catalog: ['promotion-catalog'] as const,
  types: (includeInactive: boolean) => [...promotionKeys.catalog, 'types', includeInactive] as const,
  conditions: (includeInactive: boolean) => [...promotionKeys.catalog, 'conditions', includeInactive] as const,
  conditionValues: (id: string, search: string) => [...promotionKeys.catalog, 'values', id, search] as const,
  facts: () => [...promotionKeys.catalog, 'facts'] as const,
  sources: () => [...promotionKeys.catalog, 'sources'] as const,
};

/** The catalogue. */
export function usePromotions(query: PromotionQuery = {}, enabled = true) {
  return useQuery({
    queryKey: promotionKeys.list(query),
    queryFn: ({ signal }) => promotionsApi.list(query, signal),
    staleTime: 30_000,
    enabled,
  });
}

/**
 * One promotion, with its versions.
 *
 * `staleTime: 0` — this is what somebody reads before signing, and a stale copy could
 * show a version another approver has already decided.
 */
export function usePromotion(id: string | undefined) {
  return useQuery({
    queryKey: promotionKeys.detail(id ?? ''),
    queryFn: ({ signal }) => promotionsApi.get(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/** The category → SAP price group join. Changes rarely. */
export function useCategoryMappings() {
  return useQuery({
    queryKey: promotionKeys.categoryMappings(),
    queryFn: ({ signal }) => promotionsApi.listCategoryMappings(signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePromotionInput) => promotionsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.all });
      // Type rows count the promotions filed under them.
      queryClient.invalidateQueries({ queryKey: promotionKeys.catalog });
    },
  });
}

/** Submit, approve, reject, activate, deactivate or cancel. */
export function usePromotionTransition(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      action: 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel';
      comment?: string;
      reason?: string;
    }) => promotionsApi.transition(id, input.action, { comment: input.comment, reason: input.reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

/** Queues the SAP condition. */
export function useSyncPromotionToSap(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => promotionsApi.syncToSap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

// --- Spreadsheet import and export ------------------------------------------------

/** Downloads the blank workbook. A mutation, not a query: it is an action, not state. */
export function useDownloadPromotionTemplate() {
  return useMutation({
    mutationFn: () => promotionsApi.downloadTemplate(),
  });
}

/** Exports the catalogue under the filters currently on screen. */
export function useExportPromotions() {
  return useMutation({
    mutationFn: (query: PromotionQuery) => promotionsApi.exportCatalogue(query),
  });
}

/**
 * Uploads a workbook, or validates one without writing.
 *
 * Invalidates the catalogue only when something was actually written. A refused import
 * and a dry run both wrote nothing, so refetching would redraw identical rows and imply
 * that something had changed.
 */
export function useImportPromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { file: File; dryRun?: boolean }) =>
      promotionsApi.import(input.file, input.dryRun ?? false),
    onSuccess: (result) => {
      if (result.imported) {
        queryClient.invalidateQueries({ queryKey: promotionKeys.all });
        queryClient.invalidateQueries({ queryKey: promotionKeys.catalog });
      }
    },
  });
}

/** Downloads the error report for a file that failed. Never writes anything. */
export function useDownloadPromotionErrorReport() {
  return useMutation({
    mutationFn: (file: File) => promotionsApi.downloadErrorReport(file),
  });
}

// --- Catalogue: types and condition definitions -----------------------------------

const CATALOG_STALE = 5 * 60_000;

/** Promotion types. `includeInactive` for filters and labels; `false` for new choices. */
export function usePromotionTypes(includeInactive = true) {
  return useQuery({
    queryKey: promotionKeys.types(includeInactive),
    queryFn: ({ signal }) => promotionCatalogApi.listTypes(includeInactive, signal),
    staleTime: CATALOG_STALE,
  });
}

/** Condition definitions. `false` for the rule builder, `true` for labels and settings. */
export function usePromotionConditions(includeInactive = true) {
  return useQuery({
    queryKey: promotionKeys.conditions(includeInactive),
    queryFn: ({ signal }) => promotionCatalogApi.listConditions(includeInactive, signal),
    staleTime: CATALOG_STALE,
  });
}

/** The picker values for one condition (SAP, database or static). */
export function useConditionValues(id: string | undefined, search = '', enabled = true) {
  return useQuery({
    queryKey: promotionKeys.conditionValues(id ?? '', search),
    queryFn: ({ signal }) => promotionCatalogApi.conditionValues(id!, search || undefined, signal),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}

/** Facts and source keys change only with a release. */
export function usePromotionFacts() {
  return useQuery({
    queryKey: promotionKeys.facts(),
    queryFn: ({ signal }) => promotionCatalogApi.facts(signal),
    staleTime: Infinity,
  });
}

export function usePromotionValueSources() {
  return useQuery({
    queryKey: promotionKeys.sources(),
    queryFn: ({ signal }) => promotionCatalogApi.sources(signal),
    staleTime: Infinity,
  });
}

function useCatalogMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>, alsoPromotions = false) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.catalog });
      // List rows show type names, so a type change refreshes them too.
      if (alsoPromotions) queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    },
  });
}

export function useSavePromotionType() {
  return useCatalogMutation(
    (input: { id?: string; data: PromotionTypeInput }) =>
      input.id ? promotionCatalogApi.updateType(input.id, input.data) : promotionCatalogApi.createType(input.data),
    true
  );
}

export function useSetPromotionTypeStatus() {
  return useCatalogMutation(
    (input: { id: string; isActive: boolean }) => promotionCatalogApi.setTypeStatus(input.id, input.isActive),
    true
  );
}

export function useSaveConditionDefinition() {
  return useCatalogMutation((input: { id?: string; data: ConditionDefinitionInput }) =>
    input.id
      ? promotionCatalogApi.updateCondition(input.id, input.data)
      : promotionCatalogApi.createCondition(input.data)
  );
}

export function useSetConditionStatus() {
  return useCatalogMutation((input: { id: string; isActive: boolean }) =>
    promotionCatalogApi.setConditionStatus(input.id, input.isActive)
  );
}

export function useReplaceConditionValues() {
  return useCatalogMutation((input: { id: string; values: ConditionValueDto[] }) =>
    promotionCatalogApi.replaceConditionValues(input.id, input.values)
  );
}
