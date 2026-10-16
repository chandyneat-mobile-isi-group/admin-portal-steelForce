'use client';

import { DemoMap } from './demo-map';
import { GoogleStopMap } from './google-map';
import type { StopMapProps } from './map-types';
import { hasGoogleMapsKey } from '@/features/planning/lib/google-maps';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * Picks the basemap. Google Maps renders whenever a key is configured; if the
 * script cannot load — no key, no network, blocked referrer — the module falls
 * back to the built-in vector map so planning never depends on a third party.
 */
export function MapCanvas(props: StopMapProps) {
  const [failed, setFailed] = useState(false);
  const useGoogle = hasGoogleMapsKey() && !failed;

  if (useGoogle) {
    return <GoogleStopMap {...props} onLoadError={() => setFailed(true)} />;
  }

  return (
    <div className="relative">
      <DemoMap {...props} />
      {failed && (
        <div className="absolute top-3 left-3 z-40 glass rounded-xl px-3 py-2 card-shadow flex items-center gap-2 max-w-[300px]">
          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
          <span className="text-[10.5px] text-muted-foreground leading-snug">
            Live basemap unavailable — showing the offline vector map.
          </span>
        </div>
      )}
    </div>
  );
}
