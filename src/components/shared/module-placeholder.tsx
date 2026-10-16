'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Hammer, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Stands in for a module the navigation reaches but that has no screen yet.
 *
 * The sidebar refactor introduced routes ahead of their implementations; a
 * shared placeholder keeps every menu entry navigable — and honest about being
 * unbuilt — instead of leaving dead links or inventing throwaway screens.
 */
export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  capabilities,
  relatedHref,
  relatedLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
  relatedHref?: string;
  relatedLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-[720px]"
    >
      <Card className="p-6 sm:p-8 border-surface card-shadow" style={{ borderRadius: '20px' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon size={22} className="text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[19px] font-bold text-main">{title}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                <Hammer size={10} /> Not built yet
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-surface">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Planned capabilities
          </p>
          <ul className="space-y-2">
            {capabilities.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05, duration: 0.3, ease: EASE }}
                className="flex items-start gap-2.5 text-[12.5px] text-main"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[7px] flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {relatedHref && relatedLabel && (
          <Link
            href={relatedHref}
            className="inline-flex items-center gap-1.5 mt-6 h-10 px-4 rounded-xl gradient-primary text-white text-[12.5px] font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
          >
            {relatedLabel} <ArrowRight size={14} />
          </Link>
        )}
      </Card>
    </motion.div>
  );
}
