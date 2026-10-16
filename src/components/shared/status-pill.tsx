'use client';

import type { LucideIcon } from 'lucide-react';

/**
 * Status vocabulary shared across modules.
 *
 * Every pill pairs its colour with a label, and severity-bearing states also
 * carry a shape (the leading dot is filled for "needs attention" states), so
 * status is never communicated by colour alone.
 */
export type Tone =
  | 'positive'
  | 'info'
  | 'warning'
  | 'critical'
  | 'neutral'
  | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  positive: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
};

/** Brand values, kept in step with the ramps in `tailwind.config.ts`. */
const TONE_HEX: Record<Tone, string> = {
  positive: '#2C9942', // Sustainable Green
  info: '#004A98',     // Apex Blue
  warning: '#D47C17',  // Ember 500
  critical: '#C0362C',
  neutral: '#7D8BA0',  // Slate
  accent: '#5E53AE',   // Royal 500
};

export function toneHex(tone: Tone): string {
  return TONE_HEX[tone];
}

export function StatusPill({
  label,
  tone = 'neutral',
  icon: Icon,
  dot = true,
  size = 'md',
}: {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  dot?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap leading-none ${
        size === 'sm' ? 'px-1.5 py-[3px] text-[9.5px]' : 'px-2 py-[4px] text-[10.5px]'
      } ${TONE_CLASS[tone]}`}
    >
      {Icon ? (
        <Icon size={size === 'sm' ? 9 : 10} />
      ) : dot ? (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: TONE_HEX[tone] }}
        />
      ) : null}
      {label}
    </span>
  );
}

/** Muted metadata pill — territory, category, unit. Never carries severity. */
export function MetaPill({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-lg bg-muted/60 text-muted-foreground text-[10px] font-medium whitespace-nowrap leading-none">
      {Icon && <Icon size={10} />}
      {label}
    </span>
  );
}

/** Compact progress rail used in tables for achievement / stock levels. */
export function ProgressBar({
  value,
  tone = 'info',
  className = '',
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1.5 rounded-full bg-muted/70 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, background: TONE_HEX[tone] }}
      />
    </div>
  );
}
