/**
 * React Query bindings for the planning service (local mock in the prototype).
 *
 * Mutations invalidate the whole `planning` key rather than patching the cache. The
 * board is one document — assigning a stop changes the KPIs, the rep's workload bar and
 * the pool count as well as the column that was dropped on — and hand-patching four
 * derived figures is how a header starts disagreeing with the list beneath it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  planningApi,
  type AssignStopInput,
  type OptimizeStrategyWire,
} from './api';
import type { QueryParams } from '@/services/mock';

export const planningKeys = {
  all: ['planning'] as const,
  board: (date: string, repId?: string, territory?: string) =>
    [...planningKeys.all, 'board', date, repId ?? null, territory ?? null] as const,
  candidates: (filters: QueryParams) => [...planningKeys.all, 'candidates', filters] as const,
  analytics: (filters: QueryParams) => [...planningKeys.all, 'analytics', filters] as const,
};

/**
 * The whole board for one day.
 *
 * Refetched on window focus and every half minute: a planner leaves this screen open
 * while the field works, and a board that silently goes stale is one they will plan
 * against.
 */
export function usePlanningBoard(date: string, repId?: string, territory?: string) {
  return useQuery({
    queryKey: planningKeys.board(date, repId, territory),
    queryFn: ({ signal }) => planningApi.getBoard({ date, repId, territory }, signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** The unscheduled pool for a day. */
export function usePlanningCandidates(filters: QueryParams, enabled = true) {
  return useQuery({
    queryKey: planningKeys.candidates(filters),
    queryFn: ({ signal }) => planningApi.getCandidates(filters, signal),
    enabled,
    staleTime: 30_000,
  });
}

/** Aggregates for the analytics screen. */
export function usePlanningAnalytics(filters: {
  from?: string;
  to?: string;
  repId?: string;
  territory?: string;
}) {
  return useQuery({
    queryKey: planningKeys.analytics(filters as QueryParams),
    queryFn: ({ signal }) => planningApi.getAnalytics(filters, signal),
    staleTime: 60_000,
  });
}

/** Puts one customer on one representative's day. */
export function useAssignStop() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignStopInput) => planningApi.assignStop(input),
    onSettled: () => client.invalidateQueries({ queryKey: planningKeys.all }),
  });
}

/** Takes one stop off a day. */
export function useUnassignStop() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (stopId: string) => planningApi.unassignStop(stopId),
    onSettled: () => client.invalidateQueries({ queryKey: planningKeys.all }),
  });
}

/** Rearranges a plan. `stopIds` must be every stop on the route, exactly once. */
export function useReorderStops() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, stopIds }: { planId: string; stopIds: string[] }) =>
      planningApi.reorderStops(planId, stopIds),
    onSettled: () => client.invalidateQueries({ queryKey: planningKeys.all }),
  });
}

/** Reorders a plan by one of the five strategies. */
export function useOptimizePlan() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, strategy }: { planId: string; strategy: OptimizeStrategyWire }) =>
      planningApi.optimizePlan(planId, strategy),
    onSettled: () => client.invalidateQueries({ queryKey: planningKeys.all }),
  });
}
