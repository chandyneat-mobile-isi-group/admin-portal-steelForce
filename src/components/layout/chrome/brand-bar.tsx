'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PRODUCT_LOGOS } from '@/lib/brand/assets';
import { LayoutSwitcher } from '../layout-switcher';

/**
 * The ISI STEEL mark and the layout switcher, as one unit.
 *
 * The switcher belongs beside the logo, and the logo does not sit in the same
 * place in every shell — sidebar head in ERP Workspace, top bar in the other
 * two. Binding them together here means neither shell has to know where the
 * other puts them, and the switcher can never drift away from the mark.
 *
 * Each cut ships in two inks and swaps with `dark:`, not with JS, so the right
 * one is in the first paint.
 */
export function BrandBar({
  variant = 'wordmark',
  showSwitcher = true,
  href = '/dashboard',
}: {
  /** `monogram` for collapsed rails and tight bars. */
  variant?: 'wordmark' | 'monogram';
  showSwitcher?: boolean;
  href?: string;
}) {
  const monogram = variant === 'monogram';
  const width = monogram ? 34 : 124;
  const height = monogram ? 34 : 40;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link
        href={href}
        aria-label="ISI Steel — go to dashboard"
        className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image
          src={monogram ? PRODUCT_LOGOS.monogramOnLight : PRODUCT_LOGOS.wordmarkOnLight}
          alt="ISI Steel"
          width={width}
          height={height}
          style={{ height: 'auto' }}
          className="object-contain dark:hidden"
          priority
        />
        <Image
          src={monogram ? PRODUCT_LOGOS.monogramOnDark : PRODUCT_LOGOS.wordmarkOnDark}
          alt=""
          aria-hidden
          width={width}
          height={height}
          style={{ height: 'auto' }}
          className="hidden object-contain dark:block"
          priority
        />
      </Link>

      {showSwitcher && <LayoutSwitcher compact={monogram} />}
    </div>
  );
}
