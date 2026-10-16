'use client';

import { RepAvatar } from './rep-avatar';
import { SearchBar } from '@/components/forms/search-bar';
import { usePlanning } from '@/features/planning/store';
import { EASE } from '@/lib/utilities/motion';
import type { SalesRep } from '@/features/planning/types';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

/**
 * Searchable rep list used wherever an assignment happens without a drag —
 * the stop drawer, the map popup and the keyboard path all share it.
 */
export function RepPicker({
  onPick,
  onClose,
  max = 6,
}: {
  onPick: (rep: SalesRep) => void;
  onClose?: () => void;
  max?: number;
}) {
  const { reps, workloadFor } = usePlanning();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? reps.filter((r) =>
          `${r.name} ${r.employeeId} ${r.team} ${r.province} ${r.salesOrg}`.toLowerCase().includes(q)
        )
      : reps;
    // Least-loaded first so the obvious choice is the top one.
    return [...list]
      .sort((a, b) => workloadFor(a.id).ratio - workloadFor(b.id).ratio)
      .slice(0, max);
  }, [reps, query, workloadFor, max]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="rounded-2xl border border-surface bg-card-surface p-2.5 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-2">
        <SearchBar value={query} onChange={setQuery} placeholder="Search sales rep…" className="flex-1" />
        {onClose && (
          <button
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-main px-2 py-1 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-[220px] overflow-y-auto">
        {results.map((rep) => {
          const load = workloadFor(rep.id);
          return (
            <button
              key={rep.id}
              onClick={() => onPick(rep)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/50 transition-colors text-left"
            >
              <RepAvatar rep={rep} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-main truncate">{rep.name}</span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {rep.team} · {rep.province}
                </span>
              </span>
              <span
                className={`text-[10.5px] font-semibold tabular-nums flex-shrink-0 ${
                  load.ratio >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                }`}
              >
                {load.count}/{load.capacity}
              </span>
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="text-[11.5px] text-muted-foreground text-center py-4">No sales rep matches</p>
        )}
      </div>
    </motion.div>
  );
}
