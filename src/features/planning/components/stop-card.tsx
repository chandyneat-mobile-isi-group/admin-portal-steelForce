'use client';
import { forwardRef } from 'react';

import { Card } from '@/components/ui/card';
import { MetaChip, PriorityBadge, StatusBadge } from './status-badge';
import { RepAvatar } from './rep-avatar';
import { customerTypeIcon, PRIORITY_TONE } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import { formatKm, formatTime } from '@/features/planning/lib/geo';
import { repsById } from '@/features/planning/data/demo-data';
import type { StopView } from '@/features/planning/types';
import { motion } from 'framer-motion';
import {
  Clock,
  GripVertical,
  MapPin,
  Navigation,
  Timer,
  UserPlus,
  X,
} from 'lucide-react';

export const STOP_DRAG_TYPE = 'application/x-steelforce-stop';

interface StopCardProps {
  stop: StopView;
  index?: number;
  selected?: boolean;
  draggable?: boolean;
  showRep?: boolean;
  compact?: boolean;
  onOpen?: (stop: StopView) => void;
  onAssign?: (stop: StopView) => void;
  onNavigate?: (stop: StopView) => void;
  onRemove?: (stop: StopView) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export const StopCard = forwardRef<HTMLDivElement, StopCardProps>(function StopCard({
  stop,
  index = 0,
  selected = false,
  draggable = false,
  showRep = true,
  compact = false,
  onOpen,
  onAssign,
  onNavigate,
  onRemove,
  onDragStateChange,
}, ref) {
  const customer = stop.customer;
  const TypeIcon = customerTypeIcon(customer.type);
  const rep = stop.repId ? repsById[stop.repId] : null;
  const priorityTone = PRIORITY_TONE[stop.priority];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.35, ease: EASE }}
      draggable={draggable}
      onDragStart={(e) => {
        // The native drag payload is just the id; the drop target reads the
        // stop out of the store, which keeps the two in sync.
        const ev = e as unknown as React.DragEvent<HTMLDivElement>;
        ev.dataTransfer?.setData(STOP_DRAG_TYPE, stop.id);
        ev.dataTransfer?.setData('text/plain', stop.id);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
        onDragStateChange?.(true);
      }}
      onDragEnd={() => onDragStateChange?.(false)}
      className={draggable ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <Card
        onClick={() => onOpen?.(stop)}
        className={`group relative overflow-hidden rounded-card border-surface card-shadow hover:card-shadow-hover transition-all duration-300 ${
          onOpen ? 'cursor-pointer' : ''
        } ${selected ? 'ring-2 ring-primary/50' : ''} p-4`}
      >
        {/* Priority spine */}
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: priorityTone.hex }}
        />

        <div className="flex items-start gap-3 pl-1.5">
          {draggable && (
            <GripVertical
              size={15}
              className="text-muted-foreground/40 mt-1 flex-shrink-0 group-hover:text-muted-foreground transition-colors"
            />
          )}

          <div
            className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl flex items-center justify-center flex-shrink-0`}
            style={{ background: `${priorityTone.hex}1A` }}
          >
            <TypeIcon size={compact ? 15 : 17} style={{ color: priorityTone.hex }} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`${compact ? 'text-[12.5px]' : 'text-[13.5px]'} font-semibold text-main truncate`}>
                  {customer.name}
                </p>
                <p className="text-[10.5px] text-muted-foreground truncate">
                  {customer.code} · {customer.type}
                </p>
              </div>
              <StatusBadge status={stop.status} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <PriorityBadge priority={stop.priority} />
              <MetaChip label={customer.province} icon={MapPin} />
              {!compact && <MetaChip label={customer.salesOrg} />}
              {!compact && <MetaChip label={customer.division} />}
            </div>

            <div className="flex items-center gap-3 mt-2.5 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {formatTime(stop.plannedStart)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer size={11} /> {stop.estimatedMinutes}m
              </span>
              <span className="inline-flex items-center gap-1">
                <Navigation size={11} /> {formatKm(stop.distanceKm)}
              </span>
            </div>

            {showRep && rep && (
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-surface">
                <RepAvatar rep={rep} size="sm" showStatus={false} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-main truncate">{rep.name}</p>
                  <p className="text-[9.5px] text-muted-foreground">
                    {rep.employeeId} · Stop #{stop.seq}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions — revealed on hover, always reachable on touch */}
        {(onAssign || onNavigate || onRemove) && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {onAssign && (
              <QuickAction
                icon={UserPlus}
                label={stop.repId ? 'Reassign' : 'Assign'}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign(stop);
                }}
              />
            )}
            {onNavigate && (
              <QuickAction
                icon={Navigation}
                label="Navigate"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(stop);
                }}
              />
            )}
            {onRemove && stop.repId && (
              <QuickAction
                icon={X}
                label="Remove"
                tone="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(stop);
                }}
              />
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
});

function QuickAction({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: typeof UserPlus;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium transition-all duration-200 active:scale-95 ${
        tone === 'danger'
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}
