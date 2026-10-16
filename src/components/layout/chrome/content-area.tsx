'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * The page slot every shell renders into.
 *
 * Keyed on pathname so each route plays an enter animation. Deliberately no
 * AnimatePresence/exit: `mode="wait"` holds the incoming route until the
 * outgoing exit animation reports done, which never fires in a production build
 * and silently swallows every client-side navigation.
 *
 * No `filter` in the transition, also deliberately. A filtered element becomes
 * the containing block for `position: fixed` descendants — drawers and modals
 * would anchor here instead of the viewport — and it suppresses
 * `backdrop-filter` on everything inside. Opacity + y is safe.
 *
 * `overflow-x-clip`, not `-hidden`: `hidden` turns <main> into a scroll container
 * that never scrolls, and every sticky toolbar inside it is then pinned at its
 * offset from <main> instead of under the header — pushed onto the cards below it.
 */
export function ContentArea({
  children,
  width = 'default',
  padding = 'default',
}: {
  children: React.ReactNode;
  /** `wide` for data-dense shells, `full` when the page owns its own gutters. */
  width?: 'default' | 'wide' | 'full';
  padding?: 'default' | 'tight';
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const maxWidth =
    width === 'full' ? '' : width === 'wide' ? 'max-w-[1760px]' : 'max-w-[1600px]';
  const pad = padding === 'tight' ? 'p-3 sm:p-4 lg:p-5' : 'p-4 sm:p-6 lg:p-8';

  return (
    <main className={`flex-1 overflow-x-clip ${pad}`}>
      <div key={pathname} className={`mx-auto ${maxWidth}`}>
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}
