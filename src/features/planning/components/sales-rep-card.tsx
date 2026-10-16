'use client';

import { Card } from '@/components/ui/card';
import { RepAvatar } from './rep-avatar';
import { MetaChip, RepStatusBadge } from './status-badge';
import { STOP_DRAG_TYPE } from './stop-card';
import { repColor } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import { formatKm } from '@/features/planning/lib/geo';
import type { SalesRep } from '@/features/planning/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, CheckCircle2, MapPin, Navigation, Route, Star, Users } from 'lucide-react';
import { useState } from 'react';

interface SalesRepCardProps {
  rep: SalesRep;
  stopCount: number;
  routeKm: number;
  selected?: boolean;
  index?: number;
  /** Enables the card as a drop target for the assignment board. */
  droppable?: boolean;
  /** True while any stop is being dragged — used to pre-light valid targets. */
  dragActive?: boolean;
  onSelect?: (rep: SalesRep) => void;
  onDropStop?: (stopId: string, rep: SalesRep) => void;
}

export function SalesRepCard({
  rep,
  stopCount,
  routeKm,
  selected = false,
  index = 0,
  droppable = false,
  dragActive = false,
  onSelect,
  onDropStop,
}: SalesRepCardProps) {
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const color = repColor(rep.avatarHue);
  const ratio = rep.capacity ? Math.min(1, stopCount / rep.capacity) : 0;
  const full = stopCount >= rep.capacity;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const stopId = e.dataTransfer.getData(STOP_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
    if (!stopId) return;
    onDropStop?.(stopId, rep);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1100);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.4, ease: EASE }}
      onDragOver={
        droppable
          ? (e) => {
              e.preventDefault();
              (e as unknown as React.DragEvent).dataTransfer.dropEffect = 'move';
              if (!over) setOver(true);
            }
          : undefined
      }
      onDragLeave={droppable ? () => setOver(false) : undefined}
      onDrop={droppable ? (handleDrop as unknown as (e: unknown) => void) : undefined}
      whileHover={{ y: -3 }}
    >
      <Card
        onClick={() => onSelect?.(rep)}
        className={`relative overflow-hidden p-4 rounded-card border-surface transition-all duration-300 ${
          onSelect ? 'cursor-pointer' : ''
        } ${over ? 'card-shadow-hover scale-[1.015]' : 'card-shadow hover:card-shadow-hover'} ${
          selected ? 'ring-2' : ''
        }`}
        style={{
          ...(selected ? { boxShadow: `0 0 0 2px ${color}66` } : {}),
          ...(over ? { borderColor: color, background: `${color}0D` } : {}),
        }}
      >
        {/* Drop-target overlay */}
        <AnimatePresence>
          {droppable && over && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-card border-2 border-dashed pointer-events-none"
              style={{ borderColor: color, background: `${color}14` }}
            >
              <span
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white shadow-lg"
                style={{ background: color }}
              >
                Drop to assign to {rep.name.split(' ')[0]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assignment success flourish */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute inset-0 z-20 flex items-center justify-center rounded-card pointer-events-none"
              style={{ background: `${color}1F` }}
            >
              <motion.div
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: color }}
              >
                <CheckCircle2 size={24} className="text-white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The name gets the full column width — the status badge shares the
            chip row below rather than competing for it, which kept truncating
            names to two or three characters in the board's narrow columns. */}
        <div className="flex items-start gap-3">
          <RepAvatar rep={rep} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-main truncate">{rep.name}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">
              {rep.employeeId} · {rep.team}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <RepStatusBadge status={rep.status} />
              <MetaChip label={rep.salesOrg} icon={Building2} />
              <MetaChip label={rep.division} />
              <MetaChip label={rep.province} icon={MapPin} />
            </div>
          </div>
        </div>

        {/* Capacity rail */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-[10.5px] mb-1.5">
            <span className="text-muted-foreground">Today&apos;s capacity</span>
            <span className={`font-semibold tabular-nums ${full ? 'text-amber-600 dark:text-amber-400' : 'text-main'}`}>
              {stopCount}/{rep.capacity} stops
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/70 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: full ? '#D47C17' : color }}
              initial={{ width: 0 }}
              animate={{ width: `${ratio * 100}%` }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-surface">
          <Metric icon={Route} label="Route" value={formatKm(routeKm)} />
          <Metric icon={Navigation} label="Covered" value={formatKm(rep.distanceCovered)} />
          <Metric icon={Star} label="Rating" value={rep.rating.toFixed(1)} />
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-[10.5px] text-muted-foreground">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">{rep.currentLocation}</span>
          <span className="ml-auto inline-flex items-center gap-1 flex-shrink-0">
            <Users size={11} /> {rep.shift}
          </span>
        </div>

        {/* Idle hint so empty targets read as droppable before hover */}
        {droppable && dragActive && !over && (
          <div
            className="absolute inset-0 rounded-card border-2 border-dashed pointer-events-none opacity-60"
            style={{ borderColor: `${color}66` }}
          />
        )}
      </Card>
    </motion.div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mb-0.5">
        <Icon size={10} /> {label}
      </p>
      <p className="text-[11.5px] font-semibold text-main truncate tabular-nums">{value}</p>
    </div>
  );
}
