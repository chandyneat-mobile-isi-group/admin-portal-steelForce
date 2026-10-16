'use client';

import { PRIORITY_TONE, REP_STATUS_TONE, STATUS_TONE, TIER_TONE, CREDIT_TONE } from '@/features/planning/lib/tokens';
import type { Priority, RepStatus, StopStatus } from '@/features/planning/types';
import type { LucideIcon } from 'lucide-react';

const BASE =
  'inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold border whitespace-nowrap leading-none';

export function StatusBadge({ status }: { status: StopStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={`${BASE} ${tone.chip}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.hex }} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${BASE} ${PRIORITY_TONE[priority].chip}`}>{priority}</span>;
}

export function RepStatusBadge({ status }: { status: RepStatus }) {
  const tone = REP_STATUS_TONE[status];
  return (
    <span className={`${BASE} ${tone.chip}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.hex }} />
      {status}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  return <span className={`${BASE} ${TIER_TONE[tier] ?? TIER_TONE.Silver}`}>{tier}</span>;
}

export function CreditBadge({ status }: { status: string }) {
  return <span className={`${BASE} ${CREDIT_TONE[status] ?? CREDIT_TONE.Watchlist}`}>{status}</span>;
}

/** Neutral metadata pill — sales org, division, province, customer type. */
export function MetaChip({
  label,
  icon: Icon,
  className = '',
}: {
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-lg bg-muted/60 text-muted-foreground text-[10px] font-medium whitespace-nowrap leading-none ${className}`}
    >
      {Icon && <Icon size={10} strokeWidth={2} />}
      {label}
    </span>
  );
}

/** Live pulse used for online reps and in-progress work. */
export function LiveDot({ color = '#2C9942' }: { color?: string }) {
  return (
    <span className="relative flex w-2 h-2">
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping"
        style={{ background: color }}
      />
      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: color }} />
    </span>
  );
}
