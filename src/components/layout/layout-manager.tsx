'use client';

import dynamic from 'next/dynamic';
import { useLayout } from '@/lib/layout/layout-context';
import { ERPWorkspaceLayout } from './shells/workspace';
import type { ShellProps } from './shells/types';

/**
 * Picks the workspace shell for the active preference.
 *
 * Three things this deliberately does *not* do:
 *
 * - It does not fetch. Shells render the page they are handed; data comes from
 *   the same hooks and the same `QueryClient` whichever shell is active, so
 *   switching never issues a second request.
 * - It does not check permissions. It sits inside `AuthGuard`, and every shell
 *   navigates from `navigationFor(permissions)`. A layout cannot widen access.
 * - It does not touch the route. `children` is whatever the router resolved.
 *
 * The default shell is imported statically because most sessions land on it;
 * the other two are split out, so choosing Workspace never downloads Ecosystem.
 *
 * Known trade-off: swapping shells changes the tree above `children`, so React
 * remounts the page. Query cache, session and scroll position survive;
 * uncommitted form state does not. See docs/feature/layout-system.md § Risks.
 */

const EcosystemLayout = dynamic(
  () => import('./shells/ecosystem').then((m) => m.EcosystemLayout),
  { ssr: false }
);

const ModularERPLayout = dynamic(
  () => import('./shells/modular').then((m) => m.ModularERPLayout),
  { ssr: false }
);

export function LayoutManager({ children, profileMenu, notifications }: ShellProps) {
  const { layout } = useLayout();

  switch (layout) {
    case 'ecosystem':
      return <EcosystemLayout profileMenu={profileMenu} notifications={notifications}>{children}</EcosystemLayout>;
    case 'modular':
      return <ModularERPLayout profileMenu={profileMenu} notifications={notifications}>{children}</ModularERPLayout>;
    case 'workspace':
    default:
      return <ERPWorkspaceLayout profileMenu={profileMenu} notifications={notifications}>{children}</ERPWorkspaceLayout>;
  }
}
