/**
 * Depot records, the detail drawer, and the depot repository.
 *
 * This is the feature's public API. Other features and routes import from
 * `@/features/depots` and nothing deeper — reaching into an internal path
 * couples callers to a layout that is free to change behind this barrel.
 */
export * from './components/depot-drawer';
export * from './components/sap-sync-panel';
export * from './components/depot-quotations';
export * from './components/depot-documents';
export * from './data/crm';
export { depotStore, findDepot } from './data/depot-store';
export * from './data/documents';
export * from './data/quotations';
export * from './repositories';
