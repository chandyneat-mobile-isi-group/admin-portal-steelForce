'use client';

import { useCallback, useEffect } from 'react';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { quotationsStore } from '@/features/sales/store';
import { QUOTATION_STATUS_LABEL, quotationTotals, quotationsService } from '../data/quotations';

/**
 * A depot's quotations.
 *
 * **This tab is quotations rather than orders on purpose.** The platform has no orders
 * API, so an Orders tab could only ever show invented numbers. Quotations are the same
 * records the approval queue decides on, filtered by customer.
 */
const STATUS_TONE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  PendingApproval: 'bg-amber-50 text-amber-700',
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Expired: 'bg-slate-100 text-slate-500',
};

export function DepotQuotations({ depotId }: { depotId: string }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      quotationsService.list({ customerId: depotId, page: 1, pageSize: 20 }, signal),
    [depotId]
  );

  const { data, error, isLoading, refetch } = useRepositoryQuery(['depot-quotations', depotId], load);
  // The book is shared with the pipeline board and the approval queue; follow their writes.
  useEffect(() => quotationsStore.subscribe(refetch), [refetch]);

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-10 text-center text-[12.5px] text-gray-400">Could not load quotations for this depot.</p>
    );
  }

  const rows = data?.items ?? [];

  if (rows.length === 0) {
    return <p className="py-10 text-center text-[13px] text-gray-400">No quotations for this depot.</p>;
  }

  return (
    <div className="animate-fade-in space-y-1">
      {rows.map((q) => (
        <Link
          key={q.id}
          href={`/approval/quotations/${q.id}`}
          className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 text-[12px] font-bold text-blue-600">
            <FileText size={13} /> {q.number}
          </span>
          <span className="text-[12px] text-gray-500">{formatDate(q.createdAt.slice(0, 10))}</span>
          <span className="text-[12px] font-semibold text-gray-900">{formatCurrency(quotationTotals(q).total)}</span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_TONE[q.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {QUOTATION_STATUS_LABEL[q.status]}
          </span>
        </Link>
      ))}
    </div>
  );
}
