'use client';

/**
 * The planning module's single source of state.
 *
 * ## Local, persisted
 *
 * The prototype has no backend: the board works on the seeded fixtures in
 * `data/demo-data.ts`, persisted through `data/mock-db.ts` so a route built on the board
 * survives a refresh and shows up on the calendar, map and analytics screens. Every
 * write — assign, remove, resequence, optimise, commit a call plan — updates that state
 * locally and the derived figures (KPIs, workload bars, route summaries) follow from it.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  customersById,
  depotsById,
  depots,
  repsById,
  salesReps,
  stops as seedStops,
  callPlans as seedCallPlans,
  initialImportBatches,
  repWeeklySchedules as seedWeeklySchedules,
} from './data/demo-data';
import { callPlansStore, importBatchesStore, publishedStore, stopsStore } from './data/mock-db';
import { hhmmToMinutes, minutesToHHMM, routeDistanceKm, travelMinutes } from './lib/geo';
import { DAY_START, moveWithinRoute, optimizeRoutes, withRoute } from './lib/routing';
import { mockDelay, mockId } from '@/services/mock';
import { toast } from 'sonner';
import type {
  CallPlanImportBatch,
  CallPlanItem,
  OptimizeStrategy,
  PlannedActivity,
  PlannedActivityType,
  PlanningFilters,
  RepWeeklySchedule,
  SalesRep,
  Stop,
  StopView,
} from './types';

/** Today, as the date input spells it. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DEFAULT_FILTERS: PlanningFilters = {
  search: '',
  salesOrg: 'All',
  division: 'All',
  province: 'All',
  district: 'All',
  customerType: 'All',
  priority: 'All',
  repId: 'All',
  assignment: 'All',
  visitDate: todayIso(),
};

export interface RouteSummary {
  repId: string;
  stops: StopView[];
  distanceKm: number;
  travelMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
  finishTime: string;
  orderValue: number;
}

interface PlanningContextValue {
  stops: Stop[];
  stopViews: StopView[];
  filtered: StopView[];
  unassigned: StopView[];
  assigned: StopView[];
  reps: SalesRep[];
  filters: PlanningFilters;
  setFilter: <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;

  selectedStopId: string | null;
  selectStop: (id: string | null) => void;
  selectedStop: StopView | null;
  selectedRepId: string | null;
  selectRep: (id: string | null) => void;

  summaryOpen: boolean;
  setSummaryOpen: (open: boolean) => void;

  assignStop: (stopId: string, repId: string) => void;
  unassignStop: (stopId: string) => void;
  assignAllVisible: (repId: string) => number;
  reorderStop: (repId: string, stopId: string, targetIndex: number) => void;

  strategy: OptimizeStrategy;
  setStrategy: (s: OptimizeStrategy) => void;
  optimizing: boolean;
  optimize: (repId?: string) => Promise<number>;

  published: boolean;
  publish: () => Promise<void>;

  routeFor: (repId: string) => RouteSummary;
  workloadFor: (repId: string) => { count: number; capacity: number; ratio: number };
  callPlans: CallPlanItem[];
  importBatches: CallPlanImportBatch[];
  weeklySchedules: RepWeeklySchedule[];
  addCallPlans: (newPlans: CallPlanItem[], batchInfo?: Partial<CallPlanImportBatch>) => void;
  commitCallPlans: (planIds: string[]) => void;
  toggleActivityStatus: (stopId: string, activityId: string) => void;
  kpis: {
    total: number;
    assigned: number;
    unassigned: number;
    completed: number;
    inProgress: number;
    skipped: number;
    repsWorking: number;
    coverage: number;
    avgDistance: number;
    totalDistance: number;
    plannedMinutes: number;
    orderValue: number;
    activitiesTotal: number;
    activitiesCompleted: number;
    planAdherenceRate: number;
    onTimeRate: number;
  };
  lastAssignment: { stopId: string; repId: string; at: number } | null;

  /** Always false in the prototype: the board renders the local fixtures. */
  live: boolean;
  /** Kept for consumers written against the live board; local data never loads. */
  loading: boolean;
  /** Kept for consumers written against the live board; local data never errors. */
  error: Error | null;
}

const PlanningContext = createContext<PlanningContextValue | null>(null);

function matches(view: StopView, f: PlanningFilters, repName: (id: string) => string): boolean {
  const c = view.customer;
  if (f.salesOrg !== 'All' && c.salesOrg !== f.salesOrg) return false;
  if (f.division !== 'All' && c.division !== f.division) return false;
  if (f.province !== 'All' && c.province !== f.province) return false;
  if (f.district !== 'All' && c.district !== f.district) return false;
  if (f.customerType !== 'All' && c.type !== f.customerType) return false;
  if (f.priority !== 'All' && view.priority !== f.priority) return false;
  if (f.repId !== 'All' && view.repId !== f.repId) return false;
  if (f.assignment === 'Assigned' && !view.repId) return false;
  if (f.assignment === 'Unassigned' && view.repId) return false;
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const haystack = `${c.name} ${c.code} ${c.district} ${c.province} ${c.type} ${
      view.repId ? repName(view.repId) : ''
    }`;
    if (!haystack.toLowerCase().includes(q)) return false;
  }
  return true;
}

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [fixtureStops, setFixtureStops] = useState<Stop[]>(() => seedStops.map((s) => ({ ...s })));
  const [filters, setFilters] = useState<PlanningFilters>(DEFAULT_FILTERS);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [strategy, setStrategy] = useState<OptimizeStrategy>('Distance');
  const [optimizing, setOptimizing] = useState(false);
  const [published, setPublished] = useState(false);
  const [lastAssignment, setLastAssignment] = useState<
    { stopId: string; repId: string; at: number } | null
  >(null);

  const [callPlans, setCallPlans] = useState<CallPlanItem[]>(() =>
    seedCallPlans.map((cp) => ({ ...cp }))
  );
  const [importBatches, setImportBatches] = useState<CallPlanImportBatch[]>(() => [
    ...initialImportBatches,
  ]);
  const [weeklySchedules] = useState<RepWeeklySchedule[]>(() => [...seedWeeklySchedules]);

  // Server render and first client render both use the seed; the persisted copy is
  // read after mount so hydration never sees two different boards. The write-through
  // effects are declared first so the mount pass cannot write the seed over storage.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) stopsStore.set(fixtureStops);
  }, [fixtureStops]);
  useEffect(() => {
    if (hydrated.current) callPlansStore.set(callPlans);
  }, [callPlans]);
  useEffect(() => {
    if (hydrated.current) importBatchesStore.set(importBatches);
  }, [importBatches]);
  useEffect(() => {
    if (hydrated.current) publishedStore.set(published);
  }, [published]);
  useEffect(() => {
    hydrated.current = true;
    setFixtureStops(stopsStore.get());
    setCallPlans(callPlansStore.get());
    setImportBatches(importBatchesStore.get());
    setPublished(publishedStore.get());
  }, []);

  const addCallPlans = useCallback(
    (newPlans: CallPlanItem[], batchInfo?: Partial<CallPlanImportBatch>) => {
      setCallPlans((prev) => [...newPlans, ...prev]);
      if (batchInfo) {
        const newBatch: CallPlanImportBatch = {
          id: mockId('BATCH'),
          fileName: batchInfo.fileName ?? 'imported_call_plan.csv',
          importedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          importedBy: batchInfo.importedBy ?? 'Sales Administrator',
          totalRows: newPlans.length,
          validRows: newPlans.length,
          committedRows: 0,
          status: 'Pending Review',
          ...batchInfo,
        };
        setImportBatches((prev) => [newBatch, ...prev]);
      }
    },
    []
  );

  const commitCallPlans = useCallback(
    (planIds: string[]) => {
      setCallPlans((prev) =>
        prev.map((p) => (planIds.includes(p.id) ? { ...p, status: 'Committed' as const } : p))
      );
      // Keep each upload's committed count in step with its rows.
      setImportBatches((prev) =>
        prev.map((batch) => {
          const committed = callPlans.filter(
            (p) => p.sourceFile === batch.fileName && (p.status === 'Committed' || planIds.includes(p.id))
          ).length;
          if (committed === 0) return batch;
          return {
            ...batch,
            committedRows: committed,
            status: committed >= batch.validRows ? ('Committed' as const) : batch.status,
          };
        })
      );
      setFixtureStops((prev) => {
        const plansToCommit = callPlans.filter((p) => planIds.includes(p.id));
        const newStops: Stop[] = plansToCommit.map((p, idx) => {
          const cust = customersById[p.customerId] || Object.values(customersById)[0];
          const depot = depots.find((d) => d.province === cust.province) ?? depotsById['DEP-01'] ?? depots[0];
          return {
            id: mockId('STP-CP'),
            seq: prev.length + idx + 1,
            customerId: cust.id,
            depotId: depot.id,
            repId: p.repId,
            priority: p.priority,
            status: 'Assigned',
            plannedStart: p.timeSlot.split(' - ')[0] || '09:00',
            estimatedMinutes: 45,
            distanceKm: 5.5,
            visitReason: p.objective,
            notes: `Imported from Call Plan: ${p.callPlanNo}`,
            orderValue: 2500,
            photos: 0,
            activities: p.activities.map((act, actIdx) => ({
              id: `ACT-CP-${idx}-${actIdx}`,
              type: act as PlannedActivityType,
              title: act,
              description: `Execution task for ${act}`,
              required: true,
              estimatedMinutes: 15,
              status: 'Pending' as const,
            })),
            scheduledDate: p.plannedDate,
          };
        });
        // Committed plans join their rep's route and are timed with it.
        let next = [...prev, ...newStops];
        new Set(newStops.map((stop) => stop.repId as string)).forEach((repId) => {
          if (!repsById[repId]) return;
          next = withRoute(next, repId, next.filter((stop) => stop.repId === repId).sort((a, b) => a.seq - b.seq));
        });
        return next;
      });
      toast.success(`Committed ${planIds.length} call plans to active schedule`);
    },
    [callPlans]
  );

  const toggleActivityStatus = useCallback((stopId: string, activityId: string) => {
    setFixtureStops((prev) =>
      prev.map((stop) => {
        if (stop.id !== stopId || !stop.activities) return stop;
        const updatedActivities = stop.activities.map((act) => {
          if (act.id !== activityId) return act;
          const nextStatus: PlannedActivity['status'] =
            act.status === 'Completed'
              ? 'Pending'
              : act.status === 'Pending'
              ? 'In Progress'
              : 'Completed';
          return {
            ...act,
            status: nextStatus,
            completedAt: nextStatus === 'Completed' ? new Date().toTimeString().slice(0, 5) : undefined,
          };
        });
        return { ...stop, activities: updatedActivities };
      })
    );
  }, []);

  // --- Data ---------------------------------------------------------------

  const reps = salesReps;

  const repsById_ = useMemo(() => {
    const map: Record<string, SalesRep> = {};
    reps.forEach((rep) => {
      map[rep.id] = rep;
    });
    return map;
  }, [reps]);

  const stopViews = useMemo<StopView[]>(
    () =>
      fixtureStops
        .filter((s) => customersById[s.customerId])
        .map((s) => ({ ...s, customer: customersById[s.customerId] })),
    [fixtureStops]
  );

  const stops = useMemo<Stop[]>(
    () => stopViews.map(({ customer: _customer, ...rest }) => rest),
    [stopViews]
  );

  // --- Filtering ----------------------------------------------------------

  const repName = useCallback(
    (id: string) => repsById_[id]?.name ?? repsById[id]?.name ?? '',
    [repsById_]
  );

  const setFilter = useCallback(
    <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        // District options depend on province, so a province change would
        // otherwise leave an impossible district selected and empty the list.
        if (key === 'province') next.district = 'All';
        return next;
      });
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filtered = useMemo(
    () => stopViews.filter((v) => matches(v, filters, repName)),
    [stopViews, filters, repName]
  );

  const unassigned = useMemo(() => filtered.filter((s) => !s.repId), [filtered]);
  const assigned = useMemo(() => filtered.filter((s) => s.repId), [filtered]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    (Object.keys(DEFAULT_FILTERS) as Array<keyof PlanningFilters>).forEach((k) => {
      if (k === 'visitDate') return;
      if (k === 'search') {
        if (filters.search.trim()) n += 1;
        return;
      }
      if (filters[k] !== DEFAULT_FILTERS[k]) n += 1;
    });
    return n;
  }, [filters]);

  // --- Writes -------------------------------------------------------------

  const assignStop = useCallback((stopId: string, repId: string) => {
    setFixtureStops((prev) => {
      const next = prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              repId,
              status:
                s.status === 'Completed' || s.status === 'In Progress'
                  ? s.status
                  : ('Assigned' as const),
            }
          : s
      );
      if (!repsById[repId]) return next;
      // The moved stop goes to the end of its new route; both routes are re-timed.
      const previousRep = prev.find((s) => s.id === stopId)?.repId;
      const route = next
        .filter((s) => s.repId === repId)
        .sort((a, b) => (a.id === stopId ? 1 : b.id === stopId ? -1 : a.seq - b.seq));
      let result = withRoute(next, repId, route);
      if (previousRep && previousRep !== repId) {
        result = withRoute(
          result,
          previousRep,
          result.filter((s) => s.repId === previousRep).sort((a, b) => a.seq - b.seq)
        );
      }
      return result;
    });
    setPublished(false);
    setLastAssignment({ stopId, repId, at: Date.now() });
  }, []);

  const unassignStop = useCallback((stopId: string) => {
    setFixtureStops((prev) => {
      const repId = prev.find((s) => s.id === stopId)?.repId;
      const next = prev.map((s) =>
        s.id === stopId ? { ...s, repId: null, status: 'Unassigned' as const, seq: 0 } : s
      );
      if (!repId) return next;
      // Close the gap the stop left so the remaining route keeps 1..n and real times.
      return withRoute(next, repId, next.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq));
    });
    setPublished(false);
  }, []);

  const assignAllVisible = useCallback(
    (repId: string) => {
      const ids = unassigned.map((s) => s.id);
      if (ids.length === 0) return 0;
      setFixtureStops((prev) => {
        const next = prev.map((s) =>
          ids.includes(s.id) ? { ...s, repId, status: 'Assigned' as const } : s
        );
        return withRoute(next, repId, next.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq));
      });
      setPublished(false);
      return ids.length;
    },
    [unassigned]
  );

  const reorderStop = useCallback((repId: string, stopId: string, targetIndex: number) => {
    setFixtureStops((prev) => moveWithinRoute(prev, repId, stopId, targetIndex));
    setPublished(false);
  }, []);

  const optimize = useCallback(
    async (repId?: string) => {
      setOptimizing(true);
      // Long enough for the panel's progress state to read as work being done.
      await mockDelay(900);
      const targetIds = repId
        ? [repId]
        : Array.from(new Set(stops.map((s) => s.repId).filter(Boolean) as string[]));
      const result = optimizeRoutes(fixtureStops, targetIds, strategy);
      setFixtureStops(result.stops);
      setOptimizing(false);
      setPublished(false);
      return result.touched;
    },
    [stops, fixtureStops, strategy]
  );

  const publish = useCallback(async () => {
    await mockDelay(600);
    setPublished(true);
  }, []);

  // --- Derived ------------------------------------------------------------

  const routeFor = useCallback(
    (repId: string): RouteSummary => {
      const route = stopViews.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq);
      const depotId = route[0]?.depotId;
      const depot = (depotId ? depotsById[depotId] : undefined) ?? depots[0];
      const distanceKm = routeDistanceKm(depot, route.map((s) => s.customer));
      const drive = travelMinutes(distanceKm);
      const service = route.reduce((sum, s) => sum + s.estimatedMinutes, 0);
      const total = drive + service;
      return {
        repId,
        stops: route,
        distanceKm: Number(distanceKm.toFixed(1)),
        travelMinutes: drive,
        serviceMinutes: service,
        totalMinutes: total,
        finishTime: minutesToHHMM(hhmmToMinutes(DAY_START) + total),
        orderValue: route.reduce((sum, s) => sum + s.orderValue, 0),
      };
    },
    [stopViews]
  );

  const workloadFor = useCallback(
    (repId: string) => {
      const rep = repsById_[repId] ?? repsById[repId];
      const count = stopViews.filter((s) => s.repId === repId).length;
      const capacity = rep?.capacity ?? 10;
      return { count, capacity, ratio: capacity ? count / capacity : 0 };
    },
    [stopViews, repsById_]
  );

  const kpis = useMemo(() => {
    const total = stops.length;
    const assignedCount = stops.filter((s) => s.repId).length;
    const completed = stops.filter((s) => s.status === 'Completed').length;
    const inProgress = stops.filter((s) => s.status === 'In Progress').length;
    const skipped = stops.filter((s) => s.status === 'Skipped').length;
    const activeRepIds = new Set(stops.filter((s) => s.repId).map((s) => s.repId as string));
    const totalDistance = stops.reduce((sum, s) => sum + s.distanceKm, 0);
    const plannedMinutes = stops.reduce((sum, s) => sum + s.estimatedMinutes, 0);

    const activitiesTotal = stopViews.reduce((acc, s) => acc + (s.activities?.length ?? 0), 0);
    const activitiesCompleted = stopViews.reduce(
      (acc, s) => acc + (s.activities?.filter((a) => a.status === 'Completed').length ?? 0),
      0
    );
    const completedStops = stopViews.filter((s) => s.status === 'Completed');
    const onTimeCount = completedStops.filter((s) => s.complianceStatus === 'On Time').length;
    const planAdherenceRate = assignedCount > 0 ? Math.round((completed / assignedCount) * 100) : 0;
    const onTimeRate = completedStops.length > 0 ? Math.round((onTimeCount / completedStops.length) * 100) : 0;

    return {
      total,
      assigned: assignedCount,
      unassigned: total - assignedCount,
      completed,
      inProgress,
      skipped,
      repsWorking: activeRepIds.size,
      coverage: total ? Math.round((assignedCount / total) * 100) : 0,
      avgDistance: total ? Number((totalDistance / total).toFixed(1)) : 0,
      totalDistance: Number(totalDistance.toFixed(0)),
      plannedMinutes,
      orderValue: stops.reduce((sum, s) => sum + s.orderValue, 0),
      activitiesTotal,
      activitiesCompleted,
      planAdherenceRate,
      onTimeRate,
    };
  }, [stops, stopViews]);

  const selectedStop = useMemo(
    () => stopViews.find((s) => s.id === selectedStopId) ?? null,
    [stopViews, selectedStopId]
  );

  const value = useMemo<PlanningContextValue>(
    () => ({
      stops,
      stopViews,
      filtered,
      unassigned,
      assigned,
      reps,
      filters,
      setFilter,
      resetFilters,
      activeFilterCount,
      selectedStopId,
      selectStop: setSelectedStopId,
      selectedStop,
      selectedRepId,
      selectRep: setSelectedRepId,
      summaryOpen,
      setSummaryOpen,
      assignStop,
      unassignStop,
      assignAllVisible,
      reorderStop,
      strategy,
      setStrategy,
      optimizing,
      optimize,
      published,
      publish,
      routeFor,
      workloadFor,
      callPlans,
      importBatches,
      weeklySchedules,
      addCallPlans,
      commitCallPlans,
      toggleActivityStatus,
      kpis,
      lastAssignment,
      live: false,
      loading: false,
      error: null,
    }),
    [
      stops, stopViews, filtered, unassigned, assigned, reps, filters, setFilter, resetFilters,
      activeFilterCount, selectedStopId, selectedStop, selectedRepId, summaryOpen,
      assignStop, unassignStop, assignAllVisible, reorderStop, strategy, optimizing,
      optimize, published, publish, routeFor, workloadFor, callPlans, importBatches,
      weeklySchedules, addCallPlans, commitCallPlans, toggleActivityStatus,
      kpis, lastAssignment,
    ]
  );

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning(): PlanningContextValue {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error('usePlanning must be used within a PlanningProvider');
  return ctx;
}
