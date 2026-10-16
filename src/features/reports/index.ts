/**
 * Reporting aggregates built from the other features' data.
 *
 * This is the feature's public API. Other features and routes import from
 * `@/features/reports` and nothing deeper — reaching into an internal path
 * couples callers to a layout that is free to change behind this barrel.
 */
export * from './data/reports';
