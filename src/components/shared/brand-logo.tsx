import Image from 'next/image';
import { BRAND_LOGOS } from '@/lib/brand/assets';

/**
 * The ISI brand marks, in the two forms the portal needs.
 *
 * The marks are generated into `public/brand/logos/` from the masters in
 * `assets/` by `scripts/build-brand-assets.py`, recoloured from the
 * bright-blue original to the brand navy:
 *
 * - `isi-mark-white` / `isi-mark-navy` — the ISI glyph alone on a transparent
 *   ground, for sitting inside a navy tile or on a light surface.
 * - `isi-primary` / `isi-primary-inverse` — the full lockup with the
 *   "Strength. Trust. Growth." line, for light and dark grounds.
 *
 * Theme switching is done with `dark:` visibility rather than reading the
 * theme in JS, so the right mark is in the first paint and nothing flickers
 * during hydration.
 */

export function BrandMark({
  size = 36,
  on = 'brand',
  className = '',
}: {
  size?: number;
  /** `brand` = sitting on a navy surface; `surface` = on a light/card surface. */
  on?: 'brand' | 'surface';
  className?: string;
}) {
  const src = on === 'brand' ? BRAND_LOGOS.markWhite : BRAND_LOGOS.markNavy;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );
}

export function BrandLockup({
  width = 200,
  className = '',
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round((width * 400) / 1024);
  return (
    <span className={`inline-block ${className}`} style={{ width, height }}>
      <Image
        src={BRAND_LOGOS.lockup}
        alt="ISI SteelForce — Strength. Trust. Growth."
        width={width}
        height={height}
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src={BRAND_LOGOS.lockupInverse}
        alt=""
        aria-hidden
        width={width}
        height={height}
        className="object-contain hidden dark:block"
        priority
      />
    </span>
  );
}

/** The company's core values, as they appear in the lockup. */
export const ISI_VALUES = ['Strength', 'Trust', 'Growth'] as const;
