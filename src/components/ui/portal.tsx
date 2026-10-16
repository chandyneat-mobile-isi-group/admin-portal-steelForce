'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into `document.body`.
 *
 * Needed wherever an overlay must escape its parent's box: the sidebar clips
 * its own width with `overflow-hidden` (so collapsed flyouts would be cut off),
 * and animated page wrappers can become the containing block for
 * `position: fixed` descendants.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
