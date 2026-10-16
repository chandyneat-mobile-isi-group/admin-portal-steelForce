/**
 * Where the brand assets live at runtime.
 *
 * Everything under `public/brand/` is *generated* from the masters in
 * `assets/` by `scripts/build-brand-assets.py` — don't edit it by hand, and
 * don't hardcode these paths at call sites. Import from here so a file can be
 * renamed in one place.
 *
 * Icons are not listed: the brand kit ships no icon set, so the portal uses
 * Lucide (`lucide-react`) throughout. See `assets/icons/README.md`.
 */

const LOGOS = '/brand/logos';

export const BRAND_LOGOS = {
  /** Full lockup with the "Strength. Trust. Growth." line. */
  lockup: `${LOGOS}/isi-primary.png`,
  lockupInverse: `${LOGOS}/isi-primary-inverse.png`,
  /** Square lockup — app icons, avatars, small square slots. */
  square: `${LOGOS}/isi-square.png`,
  squareInverse: `${LOGOS}/isi-square-inverse.png`,
  /** The ISI glyph alone on a transparent ground. */
  markWhite: `${LOGOS}/isi-mark-white.png`,
  markNavy: `${LOGOS}/isi-mark-navy.png`,
  /** Group monogram as recolourable SVG (`fill: currentColor`). */
  groupMark: `${LOGOS}/group/mark-group-inline.svg`,
} as const;

/** The ISI Group corporate marks, as supplied in the brand kit. */
export const GROUP_LOGOS = [
  `${LOGOS}/group/ISI-Group-Logo-1.svg`,
  `${LOGOS}/group/ISI-Group-Logo-2.svg`,
  `${LOGOS}/group/ISI-Group-Logo-3.svg`,
] as const;

/** The six operating divisions, plus the two named ISI Park sites. */
export const DIVISION_LOGOS = {
  steel: `${LOGOS}/divisions/ISI-Steel-Logo-1.svg`,
  land: `${LOGOS}/divisions/ISI-Land-Logo-1.svg`,
  park: `${LOGOS}/divisions/ISI-Park-Logo-1.svg`,
  parkNationalRoad2: `${LOGOS}/divisions/ISI-Park-National-Road2-Logo-1.svg`,
  parkVengSreng: `${LOGOS}/divisions/ISI-Park-Veng-Sreng-Logo-1.svg`,
  engineeringConstruction: `${LOGOS}/divisions/ISI-EC-Logo-1.svg`,
  sez: `${LOGOS}/divisions/ISI-SEZ-Logo-1.svg`,
  buildingSolutions: `${LOGOS}/divisions/ISI-Building-Solutions-Logo-1.svg`,
} as const;

export type Division = keyof typeof DIVISION_LOGOS;

/** Display names, so a division is never spelled two ways. */
export const DIVISION_NAMES: Record<Division, string> = {
  steel: 'ISI Steel',
  land: 'ISI Land',
  park: 'ISI Park',
  parkNationalRoad2: 'ISI Park National Road 2',
  parkVengSreng: 'ISI Park Veng Sreng',
  engineeringConstruction: 'ISI E&C',
  sez: 'ISI SEZ',
  buildingSolutions: 'ISI Building Solutions',
};

/**
 * The ISI Steel product lockup used in the portal chrome.
 *
 * `onLight` cuts are navy-inked for white surfaces; `onDark` cuts are reversed.
 * Both are served from `public/logos/` rather than `public/brand/`, because
 * they are the product's own marks rather than generated group assets.
 */
export const PRODUCT_LOGOS = {
  wordmarkOnLight: '/logos/isi-steel-dark.svg',
  wordmarkOnDark: '/logos/isi-steel-light.svg',
  monogramOnLight: '/logos/isi-monogram-dark.svg',
  monogramOnDark: '/logos/isi-monogram-light.svg',
} as const;
