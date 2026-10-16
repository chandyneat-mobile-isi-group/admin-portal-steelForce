/**
 * Thin loader + styling layer for the Google Maps JS API.
 *
 * The API is only ever touched in the browser and typed loosely on purpose:
 * pulling in @types/google.maps would add a dependency for a demo module that
 * uses a handful of constructors.
 */


import { environment } from '@/config/environment';

export const GOOGLE_MAPS_KEY = environment.googleMapsKey;

export function hasGoogleMapsKey(): boolean {
  return GOOGLE_MAPS_KEY.trim().length > 0;
}

const CALLBACK_NAME = '__steelforceMapsReady';
let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (loadPromise) return loadPromise;
  if (!hasGoogleMapsKey()) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
  }

  loadPromise = new Promise((resolve, reject) => {
    w[CALLBACK_NAME] = () => resolve(w.google);
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}` +
      `&libraries=geometry&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.onerror = () => {
      // Let the next mount retry rather than caching a rejected promise forever.
      loadPromise = null;
      reject(new Error('Failed to load the Google Maps script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Light basemap tuned to the portal surface colours. */
export const LIGHT_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#EEF2F6' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7D8BA0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F6F8FA' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#CCD5E0' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d5edda' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#ADBACA' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#DCE3EB' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#CCD5E0' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d3e4f7' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4F92DA' }] },
];

/** Dark basemap matched to `--surface-bg: #011E41`. */
export const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#011E41' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7D8BA0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#011E41' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#12233D' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14401d' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#12233D' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#3B4A63' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#22344F' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#22344F' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#01152d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b84d1' }] },
];

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Teardrop pin in the module's palette. Carries the route sequence when the
 * stop belongs to the highlighted route, so the map reads like the timeline.
 */
export function stopPinIcon(color: string, seq?: number, selected = false): string {
  const ring = selected ? 3 : 2;
  const inner = seq
    ? `<circle cx="16" cy="16" r="7.5" fill="#ffffff"/>
       <text x="16" y="19.4" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif"
             font-size="10" font-weight="700" fill="${color}">${seq}</text>`
    : `<circle cx="16" cy="16" r="5" fill="#ffffff" fill-opacity="0.95"/>`;

  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
       <path d="M16 41C16 41 29 25.6 29 16A13 13 0 1 0 3 16C3 25.6 16 41 16 41Z"
             fill="${color}" stroke="#ffffff" stroke-width="${ring}" stroke-linejoin="round"/>
       ${inner}
     </svg>`
  );
}

/** Depot marker — square shoulders so it never reads as a customer stop. */
export function depotPinIcon(color = '#011E41'): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 34 40">
       <path d="M17 39 L9.5 29.5 H5.5A3.5 3.5 0 0 1 2 26V6.5A3.5 3.5 0 0 1 5.5 3h23A3.5 3.5 0 0 1 32 6.5V26a3.5 3.5 0 0 1-3.5 3.5h-4Z"
             fill="${color}" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/>
       <path d="M10 20.5v-6l7-4 7 4v6" fill="none" stroke="#ffffff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M13.5 20.5v-4h7v4" fill="none" stroke="#ffffff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`
  );
}

/** Small dot for a rep's live position; the halo is drawn as a Circle overlay. */
export function repDotIcon(color: string): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
       <circle cx="9" cy="9" r="6" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
     </svg>`
  );
}

/** The device silhouettes the session board can draw. */
export type DeviceMarkerKind = 'mobile' | 'tablet' | 'desktop';

/**
 * Normalises whatever a client called itself into one of three silhouettes.
 *
 * Device metadata is self-reported and inconsistent - "Mac - Web", "iOS", "Postman
 * UAT" have all turned up - so this matches loosely and falls back to the desktop
 * silhouette rather than guessing at a handset.
 */
export function deviceMarkerKind(type?: string | null, os?: string | null): DeviceMarkerKind {
  const text = `${type ?? ''} ${os ?? ''}`.toLowerCase();
  if (/tablet|ipad/.test(text)) return 'tablet';
  if (/mobile|phone|android|ios|iphone|handset/.test(text)) return 'mobile';
  return 'desktop';
}

/** The glyph drawn inside the pin head, centred on (17, 16). */
const DEVICE_GLYPHS: Record<DeviceMarkerKind, string> = {
  // Handset: tall body, speaker slot, home dot.
  mobile: `<rect x="12" y="8" width="10" height="16" rx="2.2" fill="none" stroke="#ffffff" stroke-width="2"/>
           <line x1="15.2" y1="11.2" x2="18.8" y2="11.2" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
           <circle cx="17" cy="20.6" r="1.1" fill="#ffffff"/>`,
  // Tablet: same idea, wider body, no speaker slot at this size.
  tablet: `<rect x="10.5" y="8.5" width="13" height="15" rx="2" fill="none" stroke="#ffffff" stroke-width="2"/>
           <circle cx="17" cy="20.4" r="1" fill="#ffffff"/>`,
  // Desktop or browser: screen on a stand.
  desktop: `<rect x="9.5" y="9" width="15" height="10.5" rx="1.8" fill="none" stroke="#ffffff" stroke-width="2"/>
            <line x1="17" y1="19.5" x2="17" y2="22.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            <line x1="13" y1="23" x2="21" y2="23" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`,
};

/** Pin height in pixels; the anchor sits at the tip, so callers need this. */
export const DEVICE_PIN_SIZE = { width: 34, height: 42 } as const;

/**
 * A teardrop pin carrying a device silhouette, for the Sessions &amp; Devices board.
 *
 * A plain dot answers "someone is here". This answers "which of this rep's devices is
 * here" - the distinction the board exists to make, now that a position can be
 * reported per session rather than per person.
 *
 * Anchor at the tip (17, 42): a pin whose centre sits on the coordinate points at the
 * wrong place by half its own height.
 */
export function devicePinIcon(kind: DeviceMarkerKind, color: string): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DEVICE_PIN_SIZE.width}" height="${DEVICE_PIN_SIZE.height}" viewBox="0 0 34 42">
       <path d="M17 41S31 25.6 31 16A14 14 0 1 0 3 16c0 9.6 14 25 14 25Z"
             fill="${color}" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/>
       ${DEVICE_GLYPHS[kind]}
     </svg>`
  );
}
