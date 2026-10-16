'use client';

import { Card } from '@/components/ui/card';
import { usePlanning } from '@/features/planning/store';
import { OPTIMIZE_STRATEGIES, type OptimizeStrategy } from '@/features/planning/types';
import { EASE } from '@/lib/utilities/motion';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Clock,
  Crown,
  Flag,
  Loader2,
  Navigation,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const STRATEGY_META: Record<OptimizeStrategy, { icon: LucideIcon; blurb: string }> = {
  Distance: { icon: Navigation, blurb: 'Shortest driving route from the depot' },
  Priority: { icon: Flag, blurb: 'Critical and high-priority stops first' },
  'Customer Level': { icon: Crown, blurb: 'Platinum and gold accounts lead the day' },
  'Planned Time': { icon: Clock, blurb: 'Respect the originally planned windows' },
  'Sales Territory': { icon: Building2, blurb: 'Group by province and district' },
};

/**
 * Route optimisation controls. The reordering is real (see `sortByStrategy` in
 * the store); the "engine" framing is demo dressing.
 */
export function OptimizationPanel({
  repId,
  className = '',
}: {
  repId?: string;
  className?: string;
}) {
  const { strategy, setStrategy, optimize, optimizing } = usePlanning();

  const run = async () => {
    const touched = await optimize(repId);
    if (touched === 0) {
      toast.info('Nothing to optimise', {
        description: 'Assign at least one stop to a sales rep first.',
      });
      return;
    }
    toast.success(`Route optimised by ${strategy.toLowerCase()}`, {
      description: `${touched} stop${touched === 1 ? '' : 's'} resequenced and re-timed.`,
    });
  };

  return (
    <Card className={`p-6 rounded-card border-surface card-shadow ${className}`}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wand2 size={16} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-main">Optimise route</p>
          <p className="text-[10.5px] text-muted-foreground truncate">
            {repId ? 'Applies to the selected rep' : 'Applies to every assigned rep'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {OPTIMIZE_STRATEGIES.map((s) => {
          const meta = STRATEGY_META[s];
          const active = strategy === s;
          return (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] ${
                active
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-surface hover:border-primary/20 hover:bg-accent/40'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  active ? 'border-primary' : 'border-muted-foreground/40'
                }`}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.16, ease: EASE }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  )}
                </AnimatePresence>
              </span>
              <meta.icon size={14} className={active ? 'text-primary' : 'text-muted-foreground'} />
              <span className="min-w-0 flex-1">
                <span className={`block text-[12px] font-medium ${active ? 'text-primary' : 'text-main'}`}>
                  {s}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">{meta.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={run}
        disabled={optimizing}
        className="w-full mt-3.5 h-10 rounded-xl gradient-primary text-white text-[12.5px] font-semibold flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
      >
        {optimizing ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Optimising…
          </>
        ) : (
          <>
            <Sparkles size={14} /> Run optimisation
          </>
        )}
      </button>

      <AnimatePresence>
        {optimizing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full w-1/3 rounded-full gradient-primary"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
