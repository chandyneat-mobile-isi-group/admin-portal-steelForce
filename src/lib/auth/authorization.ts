import { hasPermission } from '@/domain/permissions';
import { isEnabled } from '@/config/features';
import type { Permission } from './types';
import { PUBLIC_ROUTES, ROUTE_RULES, type RouteRule } from '@/config/permissions';

/**
 * Route authorization logic. The policy table it reads lives in
 * `config/permissions.ts`.
 */

export type { RouteRule } from '@/config/permissions';
export { PUBLIC_ROUTES, ROUTE_RULES } from '@/config/permissions';

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Longest-prefix match, so `/user-management/roles` resolves to `roles.manage`
 * rather than the broader `users.manage` rule it also matches.
 */
export function ruleForRoute(pathname: string): RouteRule | null {
  let best: RouteRule | null = null;
  for (const rule of ROUTE_RULES) {
    const matches = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (!matches) continue;
    if (!best || rule.prefix.length > best.prefix.length) best = rule;
  }
  return best;
}

export type RouteDecision =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' | 'unknown_route' };

/**
 * The one function that decides whether a caller may open a path. Guards call
 * it; nothing re-implements the logic.
 *
 * `permissions` is `null` for a signed-out visitor and the session's own
 * `isi:permission`-derived list otherwise — this is a straight client-side
 * mirror of `[RequiresPermission]` (Authorization.md). It is a UX guard, not
 * a security boundary: the resource server enforces the same permissions
 * again on every API call, which is what actually matters.
 */
export function authorizeRoute(pathname: string, permissions: readonly Permission[] | null): RouteDecision {
  if (isPublicRoute(pathname)) return { allowed: true };
  if (!permissions) return { allowed: false, reason: 'unauthenticated' };

  const rule = ruleForRoute(pathname);
  // Unmapped paths are denied rather than allowed: a new route is protected by
  // default, and forgetting to add a rule fails closed.
  if (!rule) return { allowed: false, reason: 'unknown_route' };
  // A temporarily hidden module is closed to everyone, regardless of permission.
  if (rule.feature && !isEnabled(rule.feature)) return { allowed: false, reason: 'forbidden' };
  if (rule.permission === null) return { allowed: true };

  return hasPermission(permissions, rule.permission) || (rule.anyOf ?? []).some((p) => hasPermission(permissions, p))
    ? { allowed: true }
    : { allowed: false, reason: 'forbidden' };
}

/**
 * Where to send a caller after login, or when they're bounced off a page they
 * may not see. Resolves the first landing page their permissions actually
 * cover rather than assuming everyone holds `dashboard.view`.
 */
export function landingRouteFor(permissions: readonly Permission[]): string {
  if (hasPermission(permissions, 'dashboard.view')) return '/dashboard';
  const fallback = ROUTE_RULES.find(
    (rule) =>
      rule.permission !== null &&
      (!rule.feature || isEnabled(rule.feature)) &&
      hasPermission(permissions, rule.permission)
  );
  return fallback?.prefix ?? '/profile';
}
