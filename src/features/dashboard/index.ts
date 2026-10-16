/**
 * The dashboard feature's public API.
 *
 * One dataset (`data/overview.ts`), one read (`useOverview`), three
 * presentations. Consumers import from here, never from a file inside.
 */
export { useOverview, type OverviewStat } from './hooks/use-overview';
export { EcosystemOverview } from './views/ecosystem-overview';
export { ModularOverview } from './views/modular-overview';
export { WorkspaceOverview } from './views/workspace-overview';
export { SalesOverview } from './views/sales-overview';
