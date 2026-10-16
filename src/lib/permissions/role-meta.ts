import { PERMISSIONS, type Permission, type Role } from '@/domain/enums/auth';

/**
 * Seed permission grants for the **static demo repository only**
 * (repository.ts's `StaticAuthRepository`). Against the real backend, this
 * table is never consulted for an authorization decision — permissions come
 * from the `isi:permission` claims on the access token instead
 * (Authorization.md: "Authorisation decisions are made on permissions, never
 * on role names"). It's kept here so the offline demo accounts still gate UI
 * sensibly without a server.
 */
export const DEMO_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  Admin: PERMISSIONS,

  SalesRepManager: [
    'dashboard.view',
    'customers.view',
    'customers.manage',
    'sales.view',
    'sales.manage',
    'products.view',
    'visits.view',
    'visits.manage',
    'reports.view',
  ],

  SalesAdmin: [
    'dashboard.view',
    'customers.view',
    'customers.manage',
    'sales.view',
    'sales.manage',
    'products.view',
    'reports.view',
  ],

  Finance: ['dashboard.view', 'sales.view', 'reports.view'],
};

/** Permissions the demo repository grants a given role. Empty for unknown roles. */
export function demoPermissionsFor(role: Role): readonly Permission[] {
  return DEMO_ROLE_PERMISSIONS[role] ?? [];
}

export interface RoleMeta {
  label: string;
  description: string;
  /** Tailwind classes for the role badge — tone only, no layout. */
  badge: string;
}

/**
 * Display metadata for known roles. The real backend's role catalogue
 * (Authorization.md, "Default roles") is administrator-owned and can hand
 * back names this map has never seen ("Sales Manager", "Warehouse", ...) —
 * always read through `roleMetaFor`, never index this object directly.
 */
const ROLE_META: Record<string, RoleMeta> = {
  Admin: {
    label: 'Administrator',
    description: 'Full access to every module and system setting',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  SalesRepManager: {
    label: 'Sales Rep Manager',
    description: 'Commercial modules and field operations',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  SalesAdmin: {
    label: 'Sales Admin',
    description: 'Commercial modules without field operations',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  Finance: {
    label: 'Finance',
    description: 'Sales and reporting visibility',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
};

const DEFAULT_ROLE_META: RoleMeta = {
  label: 'Team member',
  description: 'Access according to their assigned permissions',
  badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

/** Safe lookup — falls back to a neutral badge for roles the frontend has never been told about. */
export function roleMetaFor(role: Role): RoleMeta {
  return ROLE_META[role] ?? DEFAULT_ROLE_META;
}
