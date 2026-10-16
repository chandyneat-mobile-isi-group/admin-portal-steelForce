import {
  Boxes,
  Building2,
  HardHat,
  Hammer,
  Store,
  Truck,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CustomerType, Priority, RepStatus, StopStatus } from '../types';

/**
 * Single source of truth for the module's colour and icon language. Pages
 * import from here instead of re-declaring Tailwind classes, so a status only
 * ever looks one way across cards, badges, map markers and the timeline.
 */

export interface Tone {
  /** Badge / chip surface. */
  chip: string;
  /** Solid colour for map markers, dots and progress fills. */
  hex: string;
  /** Icon tile background. */
  tile: string;
  /** Icon and emphasised text colour. */
  text: string;
}

export const STATUS_TONE: Record<StopStatus, Tone> = {
  Unassigned: {
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    hex: '#7D8BA0',
    tile: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-300',
  },
  Assigned: {
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    hex: '#004A98',
    tile: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  'In Progress': {
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hex: '#D47C17',
    tile: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Completed: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    hex: '#2C9942',
    tile: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  Skipped: {
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    hex: '#C33A50',
    tile: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
  },
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  Critical: {
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    hex: '#C33A50',
    tile: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
  },
  High: {
    chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    hex: '#E0592A',
    tile: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
  },
  Medium: {
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    hex: '#2571C2',
    tile: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
  },
  Low: {
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    hex: '#7D8BA0',
    tile: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-300',
  },
};

export const REP_STATUS_TONE: Record<RepStatus, Tone> = {
  Working: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    hex: '#2C9942',
    tile: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  'On Route': {
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    hex: '#004A98',
    tile: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  Break: {
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hex: '#D47C17',
    tile: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Offline: {
    chip: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
    hex: '#ADBACA',
    tile: 'bg-slate-500/10',
    text: 'text-slate-500 dark:text-slate-400',
  },
};

/**
 * Icons per customer type, for both vocabularies.
 *
 * The platform stores four types — `retailer`, `wholesaler`, `distributor`,
 * `keyAccount` — while the demo fixtures use eight descriptive ones. Both are keyed
 * here rather than translated, because they are genuinely different vocabularies and
 * mapping "Construction Site" onto one of the four would invent a classification.
 *
 * <b>Index it through {@link customerTypeIcon}, never directly.</b> `CustomerType` is a
 * union widened with `string`, so a direct lookup type-checks and returns `undefined`
 * at runtime for anything unlisted — which React renders as
 * "Element type is invalid", several components away from the cause.
 */
export const CUSTOMER_TYPE_ICON: Record<string, LucideIcon> = {
  // Demo fixture vocabulary.
  'Hardware Shop': Wrench,
  'Steel Shop': Hammer,
  Depot: Warehouse,
  Contractor: HardHat,
  'Retail Shop': Store,
  Distributor: Truck,
  'Construction Site': Building2,
  Outlet: Boxes,

  // The platform's own four, as the API spells them.
  retailer: Store,
  wholesaler: Boxes,
  distributor: Truck,
  keyAccount: Building2,
};

/** What an unclassified customer gets. */
const FALLBACK_CUSTOMER_ICON: LucideIcon = Store;

/**
 * Resolves a customer type to an icon, falling back rather than returning undefined.
 *
 * A customer whose type this build has never heard of is a rendering question, not an
 * error: the card should still draw, with a neutral mark.
 */
export function customerTypeIcon(type: CustomerType | string | null | undefined): LucideIcon {
  if (!type) return FALLBACK_CUSTOMER_ICON;
  return CUSTOMER_TYPE_ICON[type] ?? FALLBACK_CUSTOMER_ICON;
}

export const TIER_TONE: Record<string, string> = {
  Platinum: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Gold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Silver: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  Bronze: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

export const CREDIT_TONE: Record<string, string> = {
  'Good Standing': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Watchlist: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'On Hold': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Overdue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

/** Reps get a stable identity colour so routes stay distinguishable on the map. */
export function repColor(hue: number): string {
  return `hsl(${hue}, 72%, 52%)`;
}

/** Shared easing — matches the shell's page transition curve. */
export { EASE } from '@/lib/utilities/motion';
