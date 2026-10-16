/**
 * React Query bindings for the Sales Reps board.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  salesEmployeesApi,
  salesRepsApi,
  type SalesEmployeeListQuery,
  type SalesRepListQuery,
  type UpdateSalesRepInput,
} from './api';

export const salesRepKeys = {
  all: ['sales-reps'] as const,
  list: (query: SalesRepListQuery) => [...salesRepKeys.all, 'list', query] as const,
  detail: (id: string, window: { from?: string; to?: string }) =>
    [...salesRepKeys.all, 'detail', id, window] as const,
};

/** Pages the field representatives with their performance for a window. */
export function useSalesReps(query: SalesRepListQuery = {}) {
  return useQuery({
    queryKey: salesRepKeys.list(query),
    queryFn: ({ signal }) => salesRepsApi.list(query, signal),
    // Reps are user accounts edited on other screens too; always re-read on mount.
    staleTime: 0,
  });
}

/**
 * One representative's full record.
 *
 * Disabled until a rep is opened: the detail carries today's route and twenty activity
 * rows, which nobody needs for every card on the board.
 */
export function useSalesRep(repId: string | null, window: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: salesRepKeys.detail(repId ?? '', window),
    queryFn: ({ signal }) => salesRepsApi.get(repId!, window, signal),
    enabled: Boolean(repId),
    staleTime: 0,
  });
}

/** Reassigns a territory, or suspends and reinstates an account. */
export function useUpdateSalesRep() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ repId, input }: { repId: string; input: UpdateSalesRepInput }) =>
      salesRepsApi.update(repId, input),
    onSettled: () => client.invalidateQueries({ queryKey: salesRepKeys.all }),
  });
}

export const salesEmployeeKeys = {
  all: ['sales-employees'] as const,
  list: (query: SalesEmployeeListQuery) => [...salesEmployeeKeys.all, 'list', query] as const,
};

/**
 * Pages SAP's sales employee register.
 *
 * `placeholderData` keeps the previous page on screen while the next one loads, so
 * stepping through 2,000-odd pages does not flash an empty table on every click.
 */
export function useSalesEmployees(query: SalesEmployeeListQuery = {}) {
  return useQuery({
    queryKey: salesEmployeeKeys.list(query),
    queryFn: ({ signal }) => salesEmployeesApi.list(query, signal),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}
