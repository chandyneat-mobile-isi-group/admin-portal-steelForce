import type { StopStatus } from '../types';

/**
 * Chart colour tokens.
 *
 * These are deliberately NOT the same hexes as `tokens.ts` (which tints badges
 * and map pins). Chart fills are large marks on a card surface, so the steps
 * here were validated against the palette checks — lightness band, chroma floor,
 * CVD separation and contrast — for both surfaces:
 *
 *   light surface #FFFFFF, dark surface #12233D
 *   [#238036, #B36211, #0D63B5, #C33A50] → all checks pass in both modes
 *
 * The worst adjacent pair (amber↔emerald, ΔE 7.9 under protanopia) sits in the
 * 6–8 floor band, which is legal only alongside secondary encoding — hence the
 * legend, direct labels and 2px surface gaps on every stacked mark below.
 * `Unassigned` uses the de-emphasis neutral rather than a hue: it means
 * "nothing yet", so it should not compete for identity.
 */

export interface ChartTheme {
  /** Slot 1 — every single-series bar/area uses this one hue. */
  primary: string;
  primarySoft: string;
  grid: string;
  axis: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  neutral: string;
}

export const CHART_LIGHT: ChartTheme = {
  primary: '#004A98',
  primarySoft: 'rgba(0, 74, 152, 0.16)',
  grid: '#DCE3EB',
  axis: '#ADBACA',
  surface: '#FFFFFF',
  tooltipBg: 'rgba(255,255,255,0.92)',
  tooltipBorder: '#DCE3EB',
  neutral: '#ADBACA',
};

export const CHART_DARK: ChartTheme = {
  primary: '#0D63B5',
  primarySoft: 'rgba(59, 132, 209, 0.22)',
  grid: '#22344F',
  axis: '#7D8BA0',
  surface: '#12233D',
  tooltipBg: 'rgba(30,41,59,0.94)',
  tooltipBorder: '#22344F',
  neutral: '#7D8BA0',
};

/** Validated status fills, shared by both modes. */
export const STATUS_FILL: Record<StopStatus, string> = {
  Completed: '#238036',
  'In Progress': '#B36211',
  Assigned: '#0D63B5',
  Unassigned: '#ADBACA',
  Skipped: '#C33A50',
};

/** Stack order: done → in flight → planned → not started → dropped. */
export const STATUS_STACK_ORDER: StopStatus[] = [
  'Completed',
  'In Progress',
  'Assigned',
  'Unassigned',
  'Skipped',
];

export function chartTheme(isDark: boolean): ChartTheme {
  return isDark ? CHART_DARK : CHART_LIGHT;
}
