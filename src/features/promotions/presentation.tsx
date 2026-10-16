/**
 * Shared rendering for promotions.
 *
 * In its own module rather than in a page, because a Next.js route file may only export
 * the page and its route config — exporting a component from one makes the build fail
 * with an unhelpful `OmitWithTag` type error.
 */
import type { ReactElement } from 'react';

/** Lifecycle colour. Active is the only one that means money is moving. */
const STATUS_TONE: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approved: 'bg-sky-50 text-sky-700 border-sky-200',
  UnderCommercialReview: 'bg-amber-50 text-amber-700 border-amber-200',
  UnderFinanceReview: 'bg-amber-50 text-amber-700 border-amber-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
  Deactivated: 'bg-slate-50 text-slate-500 border-slate-200',
  Superseded: 'bg-slate-50 text-slate-500 border-slate-200',
  Expired: 'bg-slate-50 text-slate-500 border-slate-200',
};

/** A status as a chip, with `UnderFinanceReview` spaced out for reading. */
export function StatusChip({ status }: { status?: string | null }): ReactElement {
  if (!status) {
    return <span className="text-muted-foreground text-[11px]">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        STATUS_TONE[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {status.replace(/([a-z])([A-Z])/g, '$1 $2')}
    </span>
  );
}

/** A reward as one short string: "1%", "USD 2 / unit", or the type when neither fits. */
export function rewardLabel(row: {
  rewardType?: string | null;
  rewardValue?: number | null;
  currency?: string | null;
}): string {
  if (row.rewardType === 'Percentage' && row.rewardValue != null) {
    return `${row.rewardValue}%`;
  }

  if (row.rewardType === 'FixedAmount' && row.rewardValue != null) {
    return `${row.currency ?? ''} ${row.rewardValue} / unit`.trim();
  }

  return row.rewardType ?? '—';
}
