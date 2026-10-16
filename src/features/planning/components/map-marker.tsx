'use client';

import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface MapMarkerProps {
  x: number;
  y: number;
  color: string;
  icon: LucideIcon;
  /** Route order badge, when the marker belongs to a drawn route. */
  seq?: number;
  selected?: boolean;
  pulse?: boolean;
  /** Cancels the container zoom so pins keep a constant screen size. */
  counterScale?: number;
  index?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  title?: string;
}

const SIZE = { sm: 22, md: 28, lg: 34 };

export function MapMarker({
  x,
  y,
  color,
  icon: Icon,
  seq,
  selected = false,
  pulse = false,
  counterScale = 1,
  index = 0,
  size = 'md',
  onClick,
  onHover,
  title,
}: MapMarkerProps) {
  const px = SIZE[size];

  return (
    <motion.button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      initial={{ opacity: 0, y: -14, scale: 0.4 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index, 40) * 0.012,
        type: 'spring',
        stiffness: 420,
        damping: 20,
      }}
      whileHover={{ scale: 1.18, y: -3 }}
      whileTap={{ scale: 0.94 }}
      className="absolute -translate-x-1/2 -translate-y-full origin-bottom focus:outline-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: selected ? 40 : 20,
        // Counter-scaling keeps pin geometry crisp at every zoom level.
        scale: counterScale,
      }}
    >
      {pulse && (
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full animate-ping"
          style={{
            bottom: -4,
            width: px * 0.7,
            height: px * 0.7,
            background: color,
            opacity: 0.35,
          }}
        />
      )}

      <span
        className="relative flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg"
        style={{
          width: px,
          height: px,
          background: color,
          boxShadow: selected
            ? `0 0 0 4px ${color}59, 0 8px 20px rgba(0,0,0,0.28)`
            : '0 6px 16px rgba(0,0,0,0.22)',
        }}
      >
        <Icon size={px * 0.5} className="text-white" strokeWidth={2.4} />
        {typeof seq === 'number' && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-white dark:bg-slate-900 text-[9px] font-bold flex items-center justify-center shadow"
            style={{ color }}
          >
            {seq}
          </span>
        )}
      </span>

      {/* Pin stem */}
      <span
        className="block mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `6px solid ${color}`,
          marginTop: -2,
        }}
      />
    </motion.button>
  );
}

/** Soft halo used for a rep's live position, under the pin layer. */
export function LivePresence({
  x,
  y,
  color,
  counterScale = 1,
  label,
}: {
  x: number;
  y: number;
  color: string;
  counterScale?: number;
  label?: string;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, zIndex: 15, scale: counterScale }}
      title={label}
    >
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full animate-ping"
        style={{ background: color, opacity: 0.22 }}
      />
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative block w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow"
        style={{ background: color }}
      />
    </div>
  );
}
