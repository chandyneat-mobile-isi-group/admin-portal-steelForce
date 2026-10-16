/**
 * React Query bindings for the approval hub.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuotationListQuery } from '@/features/depots';
import { quotationsStore } from '@/features/sales/store';
import { approvalsApi } from './api';

export const approvalKeys = {
  all: ['approvals'] as const,
  quotations: () => [...approvalKeys.all, 'quotations'] as const,
  quotation: (id: string) => [...approvalKeys.all, 'quotation', id] as const,
  depots: () => [...approvalKeys.all, 'depots'] as const,
  depot: (id: string) => [...approvalKeys.all, 'depot', id] as const,
};

/**
 * The quotation book is the sales store, which the pipeline board writes without going
 * through React Query. Re-read every quotation query whenever it changes, so a card
 * moved on `/quotations` is reflected here on the same render pass.
 */
function useQuotationStoreSync() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      quotationsStore.subscribe(() => {
        void queryClient.invalidateQueries({ queryKey: approvalKeys.quotations() });
        void queryClient.invalidateQueries({ queryKey: [...approvalKeys.all, 'quotation'] });
      }),
    [queryClient]
  );
}

/** Quotations sitting at the approval gate. */
export function usePendingQuotations(pageSize = 50, enabled = true) {
  useQuotationStoreSync();
  return useQuery({
    queryKey: [...approvalKeys.quotations(), 'pending', pageSize],
    queryFn: ({ signal }) => approvalsApi.pendingQuotations(pageSize, signal),
    enabled,
    // Decisions are also taken on the depot screens, outside these query keys, so
    // a queue re-reads whenever it is shown rather than trusting its cache.
    staleTime: 0,
  });
}

/** The quotation book, filtered, for the quotation approval screen. */
export function useQuotationList(query: QuotationListQuery = {}) {
  useQuotationStoreSync();
  return useQuery({
    queryKey: [...approvalKeys.quotations(), 'list', query],
    queryFn: ({ signal }) => approvalsApi.quotations(query, signal),
    staleTime: 0,
  });
}

/** One quotation, in full, for the decision page. */
export function useQuotation(id: string | undefined) {
  useQuotationStoreSync();
  return useQuery({
    queryKey: approvalKeys.quotation(id ?? ''),
    queryFn: ({ signal }) => approvalsApi.quotation(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/** Approves or rejects a quotation, then re-reads every quotation query. */
export function useQuotationDecision() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: approvalKeys.quotations() });

  const approve = useMutation({
    mutationFn: (id: string) => approvalsApi.approveQuotation(id),
    onSuccess: async (quotation) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: approvalKeys.quotation(quotation.id) })]);
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => approvalsApi.rejectQuotation(id, reason),
    onSuccess: async (quotation) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: approvalKeys.quotation(quotation.id) })]);
    },
  });

  return { approve, reject };
}

/** Depot registrations awaiting credit approval. */
export function usePendingDepots(pageSize = 50, enabled = true) {
  return useQuery({
    queryKey: [...approvalKeys.depots(), 'pending', pageSize],
    queryFn: ({ signal }) => approvalsApi.pendingDepots(pageSize, signal),
    enabled,
    // Decisions are also taken on the depot screens, outside these query keys, so
    // a queue re-reads whenever it is shown rather than trusting its cache.
    staleTime: 0,
  });
}

/** Every registration the depot approval queue tracks, in any stage. */
export function useDepotRegistrations() {
  return useQuery({
    queryKey: [...approvalKeys.depots(), 'registrations'],
    queryFn: ({ signal }) => approvalsApi.depotRegistrations(signal),
    staleTime: 0,
  });
}

/**
 * One depot registration, in full, for the decision page.
 *
 * Never served from cache: an approval changes the depot's own code, so a cached copy
 * goes wrong the moment the decision lands.
 */
export function useDepotApproval(id: string | undefined) {
  return useQuery({
    queryKey: approvalKeys.depot(id ?? ''),
    queryFn: ({ signal }) => approvalsApi.depotDetail(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/**
 * Approves a depot, then re-reads it.
 *
 * Invalidated rather than patched from the response. A final approval registers the
 * depot in SAP and SAP's customer number becomes the depot's code — so the local copy
 * is stale in a way that matters, and the queue it came from has lost a row.
 */
export function useApproveDepot(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approvalsApi.approveDepot(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalKeys.depot(id) }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.depots() }),
      ]);
    },
  });
}

/** Refuses a depot, then re-reads it. A reason is required. */
export function useRejectDepot(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => approvalsApi.rejectDepot(id, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: approvalKeys.depot(id) }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.depots() }),
      ]);
    },
  });
}
