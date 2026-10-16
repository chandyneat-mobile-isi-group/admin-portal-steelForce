/**
 * The single place `process.env` is read.
 *
 * The static prototype needs no backend URL, API timeout or auth mode — every
 * screen is served by local mock services (`src/services/mock`). The only value
 * left is optional: a browser Google Maps key. Everything here is `NEXT_PUBLIC_*`
 * and ships to the browser, so it is configuration, never a secret.
 */
export const environment = {
  /** Optional. Planning falls back to the built-in demo map when unset. */
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
} as const;
