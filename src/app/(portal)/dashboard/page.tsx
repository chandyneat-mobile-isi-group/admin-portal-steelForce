'use client';

import { SalesOverview } from '@/features/dashboard';

/**
 * The daily sales dashboard. Every workspace layout shows the same view.
 *
 * The earlier per-layout overviews (Ecosystem, Modular, Workspace) are still in
 * `features/dashboard/views` and can be switched back here if they are wanted again.
 */
export default function DashboardPage() {
  return <SalesOverview />;
}
