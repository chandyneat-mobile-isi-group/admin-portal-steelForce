/**
 * Authentication & authorization domain model.
 *
 * Nothing in this file knows how credentials are checked or where a session is
 * stored — those are repository concerns. Swapping repositories (static demo
 * vs. the real OAuth2/OIDC backend in Authentication.md) must not require
 * touching these types.
 */

/**
 * Known role names from the *demo* directory only. The real backend's role
 * catalogue is administrator-owned data (Authorization.md: "Permissions are
 * data, not constants") and can contain names this union has never heard of
 * ("Sales Manager", "Warehouse", "Human Resources", ...). The `string & {}`
 * half of the union keeps autocomplete for the known names without rejecting
 * anything the API actually sends.
 */
export const ROLES = ['Admin', 'SalesRepManager', 'SalesAdmin', 'Finance'] as const;
export type Role = (typeof ROLES)[number] | (string & {});

/**
 * Permissions are `module.action`. Screens and menu items declare the
 * permission they require; nothing checks a role name directly.
 *
 * This list is a *client-side seed* for the demo repository and for
 * TypeScript autocomplete — it is not authoritative. The real source of
 * truth is the `isi:permission` claims embedded in the access token
 * (Authorization.md, "How a check is resolved"). Treat `Permission` as
 * `string & {}` too, the same way `Role` is widened above, so a permission
 * added on the backend without a frontend deploy still works instead of
 * silently failing every `can()` check.
 */
export const PERMISSIONS = [
  'dashboard.view',

  'customers.view',
  'customers.manage',
  // Canonical on the backend too, so it needs no portal alias: the SAP boundary is
  // one capability, not a screen-level grouping.
  'customers.sync',

  'sales.view',
  'sales.manage',

  'products.view',

  'visits.view',
  'visits.manage',
  'visits.create',

  // Canonical rather than a portal alias: the portal's coarse vocabulary has no name
  // for route planning, and the token carries the canonical permissions alongside the
  // aliases, so this resolves without a new alias on the server.
  'routes.manage',

  'reports.view',

  'users.read',
  'users.create',
  'users.update',
  'users.deactivate',
  'users.manage',
  'sessions.revoke',
  'roles.read',
  'roles.manage',
  'permissions.read',
  'permissions.manage',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number] | (string & {});
