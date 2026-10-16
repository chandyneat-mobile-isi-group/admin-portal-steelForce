'use client';

import { customerTypeIcon, PRIORITY_TONE, STATUS_TONE } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import { formatDuration, formatKm, formatTime, travelMinutes } from '@/features/planning/lib/geo';
import type { Depot, StopView } from '@/features/planning/types';
import { StatusBadge } from './status-badge';
import { motion } from 'framer-motion';
import { Car, Flag, Warehouse } from 'lucide-react';

/**
 * Vertical route timeline: depot → stops in sequence → depot. Travel legs sit
 * on the connector so the manager can see where the day's time actually goes.
 */
export function RouteTimeline({
  stops,
  depot,
  accent = '#004A98',
  selectedStopId,
  onSelect,
  compact = false,
}: {
  stops: StopView[];
  depot?: Depot | null;
  accent?: string;
  selectedStopId?: string | null;
  onSelect?: (stop: StopView) => void;
  compact?: boolean;
}) {
  if (stops.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-2.5">
          <Flag size={18} className="text-muted-foreground" />
        </div>
        <p className="text-[12px] text-muted-foreground">No stops on this route yet</p>
        <p className="text-[10.5px] text-muted-foreground/70 mt-0.5">
          Drag a stop onto a sales rep to build the day
        </p>
      </div>
    );
  }

  return (
    <ol className="relative">
      {depot && (
        <TimelineRow
          time="08:00"
          title={depot.name}
          subtitle={`Depot departure · ${depot.code}`}
          color={accent}
          icon={Warehouse}
          index={0}
          compact={compact}
        />
      )}

      {stops.map((stop, i) => {
        const previous = i === 0 ? null : stops[i - 1];
        const legKm = stop.distanceKm;
        const Icon = customerTypeIcon(stop.customer.type);
        return (
          <div key={stop.id}>
            <TravelLeg km={legKm} minutes={travelMinutes(legKm)} from={previous?.customer.name ?? depot?.name} />
            <TimelineRow
              time={stop.plannedStart}
              title={stop.customer.name}
              subtitle={`${stop.customer.district} · ${stop.visitReason}`}
              color={PRIORITY_TONE[stop.priority].hex}
              icon={Icon}
              seq={i + 1}
              index={i + 1}
              compact={compact}
              selected={selectedStopId === stop.id}
              onClick={onSelect ? () => onSelect(stop) : undefined}
              trailing={
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={stop.status} />
                  <span className="text-[10px] text-muted-foreground">{stop.estimatedMinutes}m on site</span>
                </div>
              }
              dotColor={STATUS_TONE[stop.status].hex}
            />
          </div>
        );
      })}

      {depot && (
        <>
          <TravelLeg
            km={stops[stops.length - 1].distanceKm}
            minutes={travelMinutes(stops[stops.length - 1].distanceKm)}
            from={stops[stops.length - 1].customer.name}
          />
          <TimelineRow
            time="—"
            title={`Return to ${depot.name}`}
            subtitle="End of route"
            color={accent}
            icon={Flag}
            index={stops.length + 1}
            compact={compact}
            last
          />
        </>
      )}
    </ol>
  );
}

function TimelineRow({
  time,
  title,
  subtitle,
  color,
  icon: Icon,
  seq,
  index,
  compact,
  selected = false,
  last = false,
  trailing,
  dotColor,
  onClick,
}: {
  time: string;
  title: string;
  subtitle: string;
  color: string;
  icon: typeof Warehouse;
  seq?: number;
  index: number;
  compact: boolean;
  selected?: boolean;
  last?: boolean;
  trailing?: React.ReactNode;
  dotColor?: string;
  onClick?: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 14) * 0.05, duration: 0.35, ease: EASE }}
      onClick={onClick}
      className={`relative flex gap-3 ${onClick ? 'cursor-pointer' : ''} group`}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="relative w-9 h-9 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{ background: `${color}1A` }}
        >
          <Icon size={15} style={{ color }} strokeWidth={2.2} />
          {typeof seq === 'number' && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: color }}
            >
              {seq}
            </span>
          )}
          {dotColor && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card"
              style={{ background: dotColor }}
            />
          )}
        </div>
        {!last && <div className="w-px flex-1 min-h-[10px] bg-border" />}
      </div>

      <div
        className={`flex-1 min-w-0 ${compact ? 'pb-3' : 'pb-4'} ${
          selected ? 'rounded-xl bg-primary/5 -mx-2 px-2 py-1' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] text-muted-foreground tabular-nums">
              {time === '—' ? '—' : formatTime(time)}
            </p>
            <p className="text-[12.5px] font-semibold text-main truncate mt-0.5">{title}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">{subtitle}</p>
          </div>
          {trailing}
        </div>
      </div>
    </motion.li>
  );
}

function TravelLeg({ km, minutes, from }: { km: number; minutes: number; from?: string }) {
  return (
    <li className="relative flex gap-3 -mt-1">
      <div className="w-9 flex justify-center flex-shrink-0">
        <div className="w-px h-6 bg-border" />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pb-1">
        <Car size={11} />
        <span className="tabular-nums">{formatKm(km)}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="tabular-nums">{formatDuration(minutes)} drive</span>
        {from && <span className="hidden sm:inline text-muted-foreground/60 truncate">from {from}</span>}
      </div>
    </li>
  );
}
