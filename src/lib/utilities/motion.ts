/**
 * Shared motion tokens.
 *
 * `EASE` lived inside the planning feature, which meant seven shared components
 * imported from a feature to animate — a shared-UI-to-feature dependency that
 * inverts the layering rule. Motion is design-system vocabulary, so it lives
 * here and features consume it.
 */

/** The portal's standard easing curve: fast out, settled landing. */
export const EASE = [0.22, 1, 0.36, 1] as const;
