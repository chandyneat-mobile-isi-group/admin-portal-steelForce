'use client';

import { AppLayout } from '@/lib/utilities/layout';
import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';

/**
 * Page scaffold shared by every module.
 *
 * Horizontal and top padding come from the app shell, which every portal page
 * already shares. What these components own is the *internal* rhythm — the one
 * thing that was drifting per tab — so a page never declares its own spacing.
 *
 * Composition order is fixed: toolbar first, then sections. That is what stops
 * the toolbar jumping vertically between Overview, Board, Stops, Reps, Map and
 * Reports.
 */
export function PageBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${AppLayout.page} ${className}`}>{children}</div>;
}

/**
 * The standard toolbar surface — search, filters, view switches.
 *
 * Every page that filters uses this, so the bar has the same height, chrome,
 * radius and sticky offset everywhere. Children lay themselves out; the
 * surface is all this owns.
 */
export function PageToolbar({
  children,
  sticky = true,
  className = '',
}: {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`${sticky ? `sticky ${AppLayout.stickyTop}` : ''} z-20 rounded-card border border-surface bg-card/95 backdrop-blur-xl card-shadow p-3 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** A row of toolbar controls on the 12px control gap. */
export function ToolbarRow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center ${AppLayout.controls} ${className}`}>
      {children}
    </div>
  );
}

/** Responsive card grid on the shared 16px gutter. */
export function CardGrid({
  children,
  cols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  className = '',
}: {
  children: React.ReactNode;
  cols?: string;
  className?: string;
}) {
  return <div className={`grid ${cols} ${AppLayout.grid} ${className}`}>{children}</div>;
}

/** A column of stacked cards, spaced to match the grid gutter beside it. */
export function PageRail({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`min-w-0 ${AppLayout.rail} ${className}`}>{children}</div>;
}
