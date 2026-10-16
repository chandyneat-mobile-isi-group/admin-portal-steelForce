import type { Permission } from '@/domain/enums/auth';
import type { FeatureFlag } from '@/config/features';

/**
 * The authoritative client route-to-permission table.
 *
 * It lives in config/ rather than beside the matching logic because it is
 * policy data that product owners change, not an algorithm. `lib/auth/
 * authorization.ts` consumes it; guards, the sidebar, and any future
 * middleware all resolve through that one consumer, so a route can never be
 * protected in one place and open in another.
 *
 * An unmapped protected route is DENIED. Adding a route without a rule makes
 * it inaccessible rather than public — a new page cannot leak by omission.
 */
export interface RouteRule {
  prefix: string;
  /** `null` means any authenticated user may enter. */
  permission: Permission | null;
  /** Alternatives: holding any one of these also opens the route. */
  anyOf?: Permission[];
  /** When set, the route is denied while this feature flag is disabled. */
  feature?: FeatureFlag;
}

/** Order is irrelevant — the longest matching prefix always wins. */
export const ROUTE_RULES: RouteRule[] = [
  { prefix: '/dashboard', permission: 'dashboard.view' },

  { prefix: '/depots', permission: 'customers.view' },
  { prefix: '/depots/new', permission: 'customers.manage' },

  // Writes route stops, so it carries the planning board's write permission rather than
  // a customers one — the screen's name says "depot" but the rows it creates are routes.
  { prefix: '/depots/assignments', permission: 'routes.manage', feature: 'depotAssignmentsModule' },

  { prefix: '/quotations', permission: 'sales.view', feature: 'salesModule' },
  { prefix: '/orders', permission: 'sales.view', feature: 'salesModule' },
  { prefix: '/opportunities', permission: 'sales.view' },

  // The hub, which aggregates all three queues below.
  //
  // `null` rather than one of the three permissions, because there is no single one
  // that covers it: quotations and promotions need `sales.manage`, depots need
  // `customers.manage`, and this table takes one permission per prefix. Gating on
  // either would lock out the approvers of the other kind.
  //
  // It is safe because the hub renders nothing on its own — each category is hidden
  // unless the viewer holds that category's permission, and every query behind it is
  // enforced again by the resource server. The longest-prefix rule means the three
  // specific rules below still govern their own pages.
  { prefix: '/approval', permission: null, feature: 'approvalModule' },
  { prefix: '/approval/quotations', permission: 'sales.manage', feature: 'approvalModule' },
  { prefix: '/approval/promotions', permission: 'sales.manage', feature: 'approvalModule' },
  { prefix: '/approval/depots', permission: 'customers.manage', feature: 'approvalModule' },

  { prefix: '/promotions', permission: 'sales.manage' },
  { prefix: '/promotions/configuration', permission: 'promotions.configure' },

  { prefix: '/materials', permission: 'products.view', feature: 'materialsModule' },
  { prefix: '/products', permission: 'products.view' },

  { prefix: '/planning', permission: 'visits.view' },
  { prefix: '/sales-reps', permission: 'visits.view' },
  // Creates a user account, so it needs the user-creation right, not a visits one. A
  // Sales Rep Manager holds only the representative-only variant of it.
  { prefix: '/sales-reps/new', permission: 'users.create', anyOf: ['users.create_representative'] },
  { prefix: '/visits', permission: 'visits.view', feature: 'visitsModule' },
  { prefix: '/field', permission: 'visits.view' },

  { prefix: '/reports', permission: 'reports.view' },

  { prefix: '/user-management', permission: 'users.read' },
  { prefix: '/user-management/roles', permission: 'roles.read' },
  { prefix: '/user-management/permissions', permission: 'permissions.read' },

  { prefix: '/settings', permission: 'settings.manage' },

  // Available to anyone with a session.
  { prefix: '/profile', permission: null },
  { prefix: '/notifications', permission: null },
];

/** Paths that render without a session. Everything else requires one. */
export const PUBLIC_ROUTES = ['/login', '/401', '/403'];
