/**
 * The Sessions & Devices fleet view.
 *
 * Mirrors the backend's admin sessions contract, so the mock repository and the
 * screen share one shape. Its two standing caveats are reflected below.
 */

export interface AdminSessionDevice {
  /** `mobile`, `tablet` or `desktop`, as reported by the client. */
  type: string | null;
  os: string | null;
  appVersion: string | null;
  /** Served from the session's device name; there is no separate model column. */
  model: string | null;
}

export interface AdminSessionLocation {
  lat: number;
  lng: number;
  /**
   * Always null from the API — reverse geocoding every row would be a paid call
   * per session per page load. Geocode client-side for markers in view if needed.
   */
  label: string | null;
  /**
   * When the handset took the fix, which can be well behind now: devices buffer
   * while offline and upload in batches. Label markers with this, never "now".
   */
  capturedAt: string | null;
}

export interface AdminSession {
  id: string;
  repId: string;
  repName: string;
  repEmployeeCode: string | null;
  /**
   * Derived from a 20-minute window on `lastActive`, not a live connection.
   * `lastActive` only advances when the device renews its token, so a healthy
   * handset is routinely minutes stale. A display heuristic; nothing is
   * authorised on it.
   */
  status: 'online' | 'offline' | 'revoked' | string;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  device: AdminSessionDevice;
  /**
   * The *rep's* position, not the device's: telemetry is stored against a person,
   * so a rep on two handsets shows the same point twice. Null when no telemetry
   * has ever arrived — render no pin rather than falling back to 0,0.
   */
  location: AdminSessionLocation | null;
  /** Set once an administrator has ended the session; it then reads as `revoked`. */
  revokedAt?: string | null;
}

export interface AdminSessionQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: 'online' | 'offline';
  repId?: string;
  includeRevoked?: boolean;
}
