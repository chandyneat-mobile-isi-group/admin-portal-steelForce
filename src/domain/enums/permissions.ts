/** The permission matrix vocabulary shared by roles, the admin UI, and the backend. */

export const PERMISSION_MODULES = [
  'dashboard',
  'orders',
  'customers',
  'users',
  'reports',
  'settings',
] as const;

// Must cover every action value present in roles.permissions, otherwise the
// permissions matrix would drop unlisted actions when a role is saved.
export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'update',
  'delete',
  'export',
  'manage',
  'reset_password',
] as const;

export type PermissionModule = typeof PERMISSION_MODULES[number];
export type PermissionAction = typeof PERMISSION_ACTIONS[number];
