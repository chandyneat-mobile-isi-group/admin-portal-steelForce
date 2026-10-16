/**
 * Layout scale for the portal.
 *
 * Everything is a multiple of 8 (with a 4 and a 12 half-step for control-level
 * gaps), so every surface lands on the same grid and pages stop shifting when
 * the user switches tabs.
 *
 * Note 20px is deliberately absent: it is off the 8pt grid and was the source
 * of most of the drift here — `p-5` cards next to `p-4` cards, `space-y-5`
 * sections next to `gap-4` grids.
 */
export const AppSpacing = {
  /** 4px — icon-to-label, chip internals. */
  xs: 4,
  /** 8px — tight stacks, badge rows. */
  sm: 8,
  /** 12px — filter controls, button groups. */
  md: 12,
  /** 16px — between cards, inside dense cards. */
  lg: 16,
  /** 24px — between page sections, inside panels, page padding. */
  xl: 24,
  /** 32px — major separations on large viewports. */
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof AppSpacing;

/**
 * Tailwind class constants. Pages compose these instead of writing raw
 * spacing utilities, which is what keeps the six Planning tabs identical.
 */
export const AppLayout = {
  /** Vertical rhythm between top-level page sections — 24px. */
  page: 'space-y-6',
  /** Grid gap between sibling cards — 16px. */
  grid: 'gap-4',
  /** Stacked cards inside a grid column — 16px, matching the column gap. */
  rail: 'space-y-4',
  /** Filter controls, toolbar buttons — 12px. */
  controls: 'gap-3',
  /** Padding inside a page-section panel — 24px. */
  card: 'p-6',
  /** Padding inside a repeated item card (stop, rep, KPI tile) — 16px. */
  cardCompact: 'p-4',
  /**
   * Sticky offset for a page toolbar: the shell's header (each shell sets
   * `--shell-header`) plus an 8px gap, so the bar parks just beneath the top bar.
   */
  stickyTop: 'top-[calc(var(--shell-header,64px)+8px)]',
} as const;

/**
 * Shared surface treatment for cards and panels. `rounded-card` is defined in
 * the Tailwind config so the radius is declared once rather than inlined as a
 * `style` prop on every Card.
 */
export const SURFACE = 'rounded-card border-surface card-shadow';
