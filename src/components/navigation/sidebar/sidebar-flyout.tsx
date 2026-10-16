'use client';

import { Portal } from '@/components/ui/portal';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;
const GAP = 10;
const VIEWPORT_MARGIN = 12;

export interface AnchorRect {
  top: number;
  right: number;
  height: number;
}

/**
 * Overlay anchored to a collapsed rail item — a label chip for a single link,
 * a submenu for a group.
 *
 * Portalled because the sidebar clips itself with `overflow-hidden` while its
 * width animates; anything rendered inside the aside would be cut off at the
 * rail's edge.
 */
export function SidebarFlyout({
  anchor,
  open,
  onClose,
  children,
  interactive = false,
}: {
  anchor: AnchorRect | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Submenus accept the pointer; label chips must never eat a click. */
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetTop, setOffsetTop] = useState<number | null>(null);

  // Keep the panel on screen when a long group opens near the bottom edge.
  useEffect(() => {
    if (!open || !anchor) {
      setOffsetTop(null);
      return;
    }
    const height = ref.current?.offsetHeight ?? 0;
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;
    setOffsetTop(Math.max(VIEWPORT_MARGIN, Math.min(anchor.top, maxTop)));
  }, [open, anchor, children]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && anchor && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -6, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: EASE }}
            style={{
              position: 'fixed',
              left: anchor.right + GAP,
              top: offsetTop ?? anchor.top,
              transformOrigin: 'left center',
              zIndex: 80,
              // Hidden until measured, so it never flashes in the wrong place.
              visibility: offsetTop === null ? 'hidden' : 'visible',
            }}
            className={interactive ? '' : 'pointer-events-none'}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Reads the anchor geometry the flyout needs from a trigger element. */
export function anchorFrom(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, right: rect.right, height: rect.height };
}

/**
 * Opens on hover/focus, closes on a short delay so the pointer can cross the
 * gap between the rail and the panel without the menu snapping shut. Long
 * press covers touch input on collapsed rails.
 */
export function useFlyout(delay = 140) {
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    closeTimer.current = null;
    pressTimer.current = null;
  };

  useEffect(() => clearTimers, []);

  const open = (el: HTMLElement | null) => {
    clearTimers();
    setAnchor(anchorFrom(el));
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setAnchor(null), delay);
  };

  const close = () => {
    clearTimers();
    setAnchor(null);
  };

  const longPress = (el: HTMLElement | null) => {
    clearTimers();
    pressTimer.current = window.setTimeout(() => setAnchor(anchorFrom(el)), 450);
  };

  return { anchor, isOpen: anchor !== null, open, close, scheduleClose, longPress };
}
