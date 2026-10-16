'use client';

/**
 * Reported this browser's position against its own session for the Sessions &
 * Devices board.
 *
 * A no-op in the static prototype: there is no session endpoint to report to, and
 * prompting a tester for geolocation that goes nowhere would be a permission dialog
 * with no purpose. The hook is kept so `LocationReporter` and its mount point in the
 * portal layout stay unchanged.
 */
export function useReportLocation(): void {
  // Intentionally empty — nothing is sent and the browser is never asked for a fix.
}
