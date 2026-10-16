'use client';

import { MetaChip, PriorityBadge, StatusBadge } from './status-badge';
import { RepAvatar } from './rep-avatar';
import { formatKm, formatTime } from '@/features/planning/lib/geo';
import { repsById } from '@/features/planning/data/demo-data';
import type { StopView } from '@/features/planning/types';
import { Clock, Navigation } from 'lucide-react';

/**
 * Marker popup body. Shared by the Google basemap and the offline vector map
 * so both render an identical card — only the positioning differs.
 */
export function StopPopupCard({
  stop,
  onOpen,
  onAssign,
}: {
  stop: StopView;
  onOpen?: (stop: StopView) => void;
  onAssign?: (stop: StopView) => void;
}) {
  const rep = stop.repId ? repsById[stop.repId] : null;

  return (
    <div className="w-[252px] glass rounded-card card-shadow p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-main truncate">{stop.customer.name}</p>
          <p className="text-[10.5px] text-muted-foreground truncate">
            {stop.customer.code} · {stop.customer.type}
          </p>
        </div>
        <StatusBadge status={stop.status} />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <PriorityBadge priority={stop.priority} />
        <MetaChip label={stop.customer.district} />
        <MetaChip label={stop.customer.division} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-surface text-[10.5px]">
        <div>
          <p className="text-muted-foreground flex items-center gap-1">
            <Clock size={10} /> Planned
          </p>
          <p className="font-semibold text-main">{formatTime(stop.plannedStart)}</p>
        </div>
        <div>
          <p className="text-muted-foreground flex items-center gap-1">
            <Navigation size={10} /> Distance
          </p>
          <p className="font-semibold text-main">{formatKm(stop.distanceKm)}</p>
        </div>
      </div>

      {rep && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface">
          <RepAvatar rep={rep} size="sm" showStatus={false} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-main truncate">{rep.name}</p>
            <p className="text-[9.5px] text-muted-foreground">Stop #{stop.seq} · {rep.team}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mt-3">
        {onOpen && (
          <button
            onClick={() => onOpen(stop)}
            className="flex-1 h-8 rounded-xl gradient-primary text-white text-[11.5px] font-semibold active:scale-[0.98] transition-transform"
          >
            Open detail
          </button>
        )}
        {onAssign && (
          <button
            onClick={() => onAssign(stop)}
            className="h-8 px-3 rounded-xl border border-surface text-[11.5px] font-semibold text-main hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            {stop.repId ? 'Reassign' : 'Assign'}
          </button>
        )}
      </div>
    </div>
  );
}
