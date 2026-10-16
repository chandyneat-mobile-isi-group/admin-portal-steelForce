'use client';

import { Card } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/shared/animated-counter';
import { Sparkline } from '@/components/shared/sparkline';
import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hint?: string;
  icon: LucideIcon;
  color: string;
  /** 0–100; renders the thin progress rail under the value. */
  progress?: number;
  spark?: number[];
  index?: number;
  onClick?: () => void;
  active?: boolean;
}

/**
 * The KPI tile used across the overview and the board header. Value, tone and
 * optional trend all come from props so no page hardcodes a metric style.
 */
export function SummaryCard({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  hint,
  icon: Icon,
  color,
  progress,
  spark,
  index = 0,
  onClick,
  active = false,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: EASE }}
      whileHover={{ y: -3 }}
    >
      <Card
        onClick={onClick}
        className={`p-4 rounded-card border-surface card-shadow hover:card-shadow-hover transition-shadow duration-300 h-full ${
          onClick ? 'cursor-pointer' : ''
        } ${active ? 'ring-2 ring-primary/40' : ''}`}
      >
        <div className="flex items-start justify-between mb-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}1A` }}
          >
            <Icon size={18} strokeWidth={2} style={{ color }} />
          </div>
          {spark && spark.length > 1 && (
            <Sparkline data={spark} color={color} width={64} height={24} fillId={`sp-${label.replace(/\W/g, '')}`} />
          )}
        </div>

        <p className="text-[11.5px] text-muted-foreground font-medium mb-1 truncate">{label}</p>
        <p className="text-[24px] font-bold text-main leading-none tabular-nums">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>

        {typeof progress === 'number' && (
          <div className="h-1.5 rounded-full bg-muted/70 overflow-hidden mt-3.5">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 + index * 0.05 }}
            />
          </div>
        )}

        {hint && <p className="text-[10.5px] text-muted-foreground mt-2.5 truncate">{hint}</p>}
      </Card>
    </motion.div>
  );
}
