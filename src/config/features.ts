/**
 * Feature flags.
 *
 * A flag belongs here when a capability must be switchable without a code
 * change — an unfinished module, a rollout gated per environment, or a
 * dependency that may be absent. A flag is NOT an access-control mechanism:
 * use permissions (`config/permissions.ts`) for anything a user should or
 * should not be allowed to do.
 *
 * Keep this list short. Every flag is a branch that has to be tested in both
 * states, and a flag nobody ever flips is dead weight — delete it once the
 * feature has shipped.
 */

import { environment } from './environment';

export const features = {

  /**
   * Planning renders the interactive Google map when a key is present and the
   * built-in demo map otherwise. Both paths are supported; this is not a
   * temporary flag.
   */
  googleMaps: environment.googleMapsKey.length > 0,

  /**
   * Module switches. The static prototype shows every module so each workflow
   * can be demonstrated; a `false` here removes the module from every menu and
   * denies its routes — nothing else needs to change.
   */
  approvalModule: true,
  salesModule: true,
  materialsModule: true,
  depotAssignmentsModule: true,
  visitsModule: true,
} as const;

export type FeatureFlag = keyof typeof features;

export function isEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
