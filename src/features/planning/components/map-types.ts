import type { Depot, SalesRep, StopView } from '@/features/planning/types';

/**
 * Shared contract for both basemaps (Google and the offline vector map), so
 * `MapCanvas` can swap one for the other without the caller knowing.
 */
export interface StopMapProps {
  stops: StopView[];
  depots?: Depot[];
  reps?: SalesRep[];
  /** Ordered stops for the highlighted route; drawn as an animated polyline. */
  routeStops?: StopView[];
  routeDepot?: Depot | null;
  routeColor?: string;
  selectedStopId?: string | null;
  onSelectStop?: (stop: StopView) => void;
  onOpenStop?: (stop: StopView) => void;
  onAssignStop?: (stop: StopView) => void;
  className?: string;
  /** Caps how many markers render at once so large plans stay smooth. */
  maxMarkers?: number;
  colorBy?: 'priority' | 'status';
  /**
   * What shape a stop's marker takes.
   *
   * `customerType` (the default) picks an icon from the customer's type, which is what
   * a planner wants when a route mixes shops, contractors and sites.
   *
   * `depot` draws every stop as a depot pin. On this platform a depot *is* a customer,
   * so on a screen whose subject is depot coverage the type icon is noise — every pin
   * means the same thing. Stops keep their status or priority colour, so they stay
   * distinguishable from the fixed dark pins of the depot layer itself.
   */
  stopIcon?: 'customerType' | 'depot';
  /** Raised when a basemap fails to initialise so the caller can fall back. */
  onLoadError?: (error: Error) => void;
}
