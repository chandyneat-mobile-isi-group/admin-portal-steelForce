import { MockDepotRepository } from './mock-depot-repository';
import { MockNonBpDepotRepository } from './mock-non-bp-depot-repository';
import type { DepotRepository } from './types';
import type { NonBpDepotRepository } from './non-bp-types';

export { AWAITING_DECISION, DEPOT_LIFECYCLE } from './types';

export type {
  CreateDepotInput,
  DepotContact,
  DepotLifecycle,
  Depot,
  DepotListQuery,
  DepotRepository,
  DepotSapOperations,
  DepotSapRegistrationStatus,
  DepotSapState,
  SapSyncStatus,
  UpdateDepotInput,
} from './types';

export type {
  CreateNonBpDepotInput,
  NonBpDepot,
  NonBpDepotListQuery,
  NonBpDepotRepository,
  NonBpDepotStatus,
} from './non-bp-types';

/**
 * The depot master and the prospect queue.
 *
 * The static prototype has no backend, so both are local repositories over persisted
 * collections. Screens depend only on the `DepotRepository` / `NonBpDepotRepository`
 * contracts, which is what a real adapter would implement.
 */
const depots = new MockDepotRepository();

export const depotsRepository: DepotRepository = depots;

export const nonBpDepotsRepository: NonBpDepotRepository = new MockNonBpDepotRepository(() => depots);

export { MockDepotRepository, MockNonBpDepotRepository };
