'use client';

import { useReportLocation } from '@/features/sessions';

/**
 * Mounts the session location reporter once for the whole portal.
 *
 * A component rather than a hook call in the layout because the portal layout is a
 * Server Component and must stay one - it is what keeps `AuthGuard` above every route.
 * Renders nothing.
 */
export function LocationReporter() {
  useReportLocation();
  return null;
}
