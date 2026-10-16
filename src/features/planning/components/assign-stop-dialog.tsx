'use client';

import { Card } from '@/components/ui/card';
import { RepPicker } from './rep-picker';
import { Portal } from '@/components/ui/portal';
import { PriorityBadge } from './status-badge';
import { EASE } from '@/lib/utilities/motion';
import type { SalesRep, StopView } from '@/features/planning/types';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Click/touch path to assignment, for anywhere dragging isn't available.
 * Portalled to the body — the shell's blurred page wrapper would otherwise
 * capture the fixed positioning and push it off-screen.
 */
export function AssignStopDialog({
  stop,
  onClose,
  onPick,
}: {
  stop: StopView | null;
  onClose: () => void;
  onPick: (stop: StopView, rep: SalesRep) => void;
}) {
  return (
    <Portal>
      <AnimatePresence>
        {stop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: EASE }}
              role="dialog"
              aria-modal="true"
              aria-label={`Assign ${stop.customer.name}`}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,calc(100vw-32px))] z-[71]"
            >
              <Card className="p-4 rounded-card border-surface card-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-main truncate">
                      Assign {stop.customer.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {stop.customer.district} · {stop.customer.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={stop.priority} />
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <RepPicker max={8} onPick={(rep) => onPick(stop, rep)} />
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
