'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { authorizeRoute, landingRouteFor } from '@/lib/auth/authorization';
import { SplashScreen } from './splash-screen';
import type { Permission, Role } from '@/lib/auth/types';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Route protection.
 *
 * Wraps the whole portal. Until the session resolves it renders the splash and
 * nothing else — children are never mounted, so a protected page cannot paint
 * before authorization is decided, including on a hard URL entry.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, permissions, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const decision = authorizeRoute(pathname, isAuthenticated ? permissions : null);

  useEffect(() => {
    if (status === 'initializing' || status === 'authenticating') return;

    if (!isAuthenticated) {
      // Preserve the destination so the user lands where they intended.
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
      return;
    }
    if (!decision.allowed) {
      router.replace(`/403?from=${encodeURIComponent(pathname)}`);
    }
  }, [status, isAuthenticated, decision.allowed, pathname, router]);

  if (status === 'initializing' || status === 'authenticating') {
    return <SplashScreen />;
  }
  if (!isAuthenticated) {
    return <SplashScreen message="Redirecting to sign in…" />;
  }
  if (!decision.allowed) {
    return <SplashScreen message="Checking your permissions…" />;
  }

  return <>{children}</>;
}

/**
 * Keeps an authenticated user off the login screen — signing in again while
 * already signed in is never what was meant.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated, permissions } = useAuth();
  const router = useRouter();
  // Whether the visitor was already signed in when the page opened. A sign-in made on
  // this page navigates itself (honouring `?next=`), so only an arrival with an
  // existing session is redirected here.
  const arrivedSignedIn = useRef<boolean | null>(null);
  if (arrivedSignedIn.current === null && status !== 'initializing') {
    arrivedSignedIn.current = isAuthenticated;
  }

  useEffect(() => {
    if (isAuthenticated && arrivedSignedIn.current) router.replace(landingRouteFor(permissions));
  }, [isAuthenticated, permissions, router]);

  if (status === 'initializing') return <SplashScreen />;
  if (isAuthenticated) return <SplashScreen message="Signing you in…" />;

  return <>{children}</>;
}

/**
 * Conditional rendering by permission. Use for actions inside a page the user
 * may legitimately see — a Finance user viewing Sales should not be offered an
 * "Edit" button they cannot use.
 */
export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: {
  permission?: Permission;
  anyOf?: readonly Permission[];
  allOf?: readonly Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can, canAny, canAll } = useAuth();

  const granted =
    (permission ? can(permission) : true) &&
    (anyOf ? canAny(anyOf) : true) &&
    (allOf ? canAll(allOf) : true);

  return <>{granted ? children : fallback}</>;
}

/** Role-based rendering. Prefer `PermissionGuard` — roles change, rights don't. */
export function RoleGuard({
  roles,
  fallback = null,
  children,
}: {
  roles: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasRole } = useAuth();
  return <>{hasRole(...roles) ? children : fallback}</>;
}
