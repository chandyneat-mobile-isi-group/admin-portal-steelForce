/**
 * User administration: accounts, departments, roles, and the audit trail.
 *
 * This is the feature's public API. Other features and routes import from
 * `@/features/users` and nothing deeper — reaching into an internal path
 * couples callers to a layout that is free to change behind this barrel.
 */
export * from './components/create-user-wizard';
export * from './components/sales-employee-select';
export * from './sales-employee-link';
export * from './components/user-management-nav';
export * from './repositories';
