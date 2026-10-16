/**
 * Sales pipeline deals and stages.
 *
 * This is the feature's public API. Other features and routes import from
 * `@/features/opportunities` and nothing deeper — reaching into an internal path
 * couples callers to a layout that is free to change behind this barrel.
 */
export * from './data/pipeline';
