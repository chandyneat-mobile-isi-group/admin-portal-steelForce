/**
 * The planning module's persisted "database" for the static prototype.
 *
 * Seeded from `demo-data.ts` and kept in localStorage, so a route a tester builds on the
 * board is still there on the calendar, the map and after a refresh. The planning store
 * and the mock planning service both read and write these collections.
 */
import { createPersistentStore } from '@/services/mock';
import {
  callPlans as seedCallPlans,
  initialImportBatches,
  stops as seedStops,
} from './demo-data';
import type { CallPlanImportBatch, CallPlanItem, Stop } from '../types';

export const stopsStore = createPersistentStore<Stop[]>('planning.stops', () =>
  seedStops.map((s) => ({ ...s, activities: s.activities?.map((a) => ({ ...a })) }))
);

export const callPlansStore = createPersistentStore<CallPlanItem[]>('planning.call-plans', () =>
  seedCallPlans.map((cp) => ({ ...cp, activities: [...cp.activities] }))
);

export const importBatchesStore = createPersistentStore<CallPlanImportBatch[]>(
  'planning.import-batches',
  () => initialImportBatches.map((b) => ({ ...b }))
);

export const publishedStore = createPersistentStore<boolean>('planning.published', () => false);
