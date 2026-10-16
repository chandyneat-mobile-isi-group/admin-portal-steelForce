/**
 * The workspace shells a user can choose between.
 *
 * A layout is presentation only: it decides navigation structure, workspace
 * composition and density. It never decides what a user may see or do — that
 * stays with `domain/permissions` and the route rules, which every shell reads
 * through the same `navigationFor()` call.
 *
 * The identifiers deliberately avoid third-party product names; the visible
 * labels live in `config/layouts.ts` and the locale files.
 */
export const LAYOUT_IDS = ['ecosystem', 'modular', 'workspace'] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];

/** The shell used when nothing is stored — today's sidebar experience. */
export const DEFAULT_LAYOUT: LayoutId = 'workspace';

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && (LAYOUT_IDS as readonly string[]).includes(value);
}
