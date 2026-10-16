'use client';

import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  count,
  action,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  count?: number;
  action?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      className="flex items-center justify-between gap-3 mb-3.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon size={15} className="text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-main truncate flex items-center gap-2">
            {title}
            {typeof count === 'number' && (
              <span className="px-1.5 py-px rounded-md bg-muted text-[10.5px] font-bold text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-surface text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
        <Icon size={20} className="text-muted-foreground" />
      </div>
      <p className="text-[13px] font-semibold text-main">{title}</p>
      {hint && <p className="text-[11.5px] text-muted-foreground mt-1 max-w-[280px]">{hint}</p>}
    </motion.div>
  );
}
