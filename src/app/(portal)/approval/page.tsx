'use client';

/**
 * Approvals — everything across the platform waiting for a decision.
 *
 * ## Why three categories rather than one merged list
 *
 * A quotation, a depot registration and a discount agreement are not the same kind of
 * decision, and the information a reviewer needs to make each one does not overlap:
 *
 * - A **quotation** has a value and a customer, and one person approves it.
 * - A **depot** has documents that may be incomplete, and approving it commits the
 *   business to a credit limit.
 * - A **promotion** is a four-signature chain, so "waiting" is four different states and
 *   which one is *yours* depends on the permissions you hold.
 *
 * Merged into one table those become a lowest-common-denominator row — a name, a date
 * and a button — which is exactly the view that gets approved without being read. So the
 * categories stay apart and each shows the two or three facts that decision turns on.
 *
 * ## The counts are honest about their limits
 *
 * Quotation and depot counts are the server's own totals for the filtered set. The
 * promotions count is derived from the first page of requests, because that endpoint
 * filters by a single status and "in the chain" is four of them — so a fifth page of
 * in-flight agreements would not be counted. The section says so rather than implying a
 * total it has not seen.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  Store,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';
import { usePendingDepots, usePendingQuotations, IN_CHAIN_STATUSES } from '@/features/approvals';
import { AWAITING_SIGNATURE, typeLabel, usePromotions } from '@/features/promotions';

/** How many rows each category previews before deferring to its own screen. */
const PREVIEW_ROWS = 5;

/** The page size the promotions count is derived from. See the module note. */
const AGREEMENT_SCAN = 100;

function CategoryCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  count,
  loading,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Store;
  tone: string;
  count: number | null;
  loading: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-gray-100 card-shadow overflow-hidden flex flex-col" style={{ borderRadius: '18px' }}>
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${tone}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
              {title}
            </h2>
            <p className="text-[11.5px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[22px] font-700 text-gray-900 leading-none tabular-nums" style={{ fontWeight: 700 }}>
            {loading ? '—' : (count ?? 0)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">waiting</p>
        </div>
      </div>

      <div className="flex-1">{children}</div>

      <Link
        href={href}
        className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-[12px] text-primary hover:bg-gray-50/70 transition-colors"
      >
        Open queue
        <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

function Rows({
  loading,
  error,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyLabel: string;
  children?: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="py-10 flex justify-center text-gray-300">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  if (error) {
    return <p className="py-10 text-center text-[12px] text-red-500">Could not load this queue.</p>;
  }

  if (empty) {
    return (
      <div className="py-10 text-center">
        <CheckCircle2 size={18} className="text-green-400 mx-auto mb-1.5" />
        <p className="text-[12px] text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return <div className="divide-y divide-gray-50">{children}</div>;
}

export default function ApprovalHubPage() {
  // The route itself is open to any session; the categories are what carry the
  // permissions. A viewer sees only the queues they could act on, and the queries for
  // the others are never issued — a 403 in the network log is noise, not information.
  const { can } = useAuth();
  const canSales = can('sales.manage');
  const canDepots = can('customers.manage');

  const quotations = usePendingQuotations(PREVIEW_ROWS, canSales);
  const depots = usePendingDepots(PREVIEW_ROWS, canDepots);
  const promotions = usePromotions({ pageSize: AGREEMENT_SCAN });

  // "Awaiting a signature" is two statuses and the endpoint filters by one, so this is
  // computed over the page we have rather than asked for as a total.
  const inChain = useMemo(
    () =>
      (promotions.data?.items ?? []).filter((row) =>
        (AWAITING_SIGNATURE as readonly string[]).includes(row.status)
      ),
    [promotions.data]
  );

  const total =
    (canSales ? (quotations.data?.totalCount ?? 0) : 0) +
    (canDepots ? (depots.data?.totalCount ?? 0) : 0) +
    (canSales ? inChain.length : 0);

  const visibleCount = (canSales ? 2 : 0) + (canDepots ? 1 : 0);

  const anyLoading =
    (canSales && (quotations.isLoading || promotions.isLoading)) || (canDepots && depots.isLoading);

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck size={22} className="text-gray-400" />
            Approvals
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Everything waiting for a decision, grouped by what kind of decision it is.
          </p>
        </div>
        <p className="text-[12px] text-gray-400">
          {anyLoading
            ? 'Counting…'
            : `${total} item${total === 1 ? '' : 's'} across ${visibleCount} queue${visibleCount === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* --- Quotations --- */}
        {canSales && (
        <CategoryCard
          title="Quotations"
          subtitle="Priced documents awaiting release to the customer"
          icon={FileCheck}
          tone="bg-blue-50 text-blue-600"
          count={quotations.data?.totalCount ?? null}
          loading={quotations.isLoading}
          href="/approval/quotations"
        >
          <Rows
            loading={quotations.isLoading}
            error={quotations.error}
            empty={(quotations.data?.items.length ?? 0) === 0}
            emptyLabel="No quotations awaiting approval"
          >
            {quotations.data?.items.map((q) => (
              <Link
                key={q.id}
                href={`/approval/quotations/${q.id}`}
                className="block px-5 py-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                    {q.number}
                  </span>
                  {q.net != null && (
                    <span className="text-[12px] text-gray-900 tabular-nums flex-shrink-0">
                      {q.currency ?? ''} {q.net.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {q.customerName || q.customerId || 'Unknown customer'} · {q.lineCount} line
                  {q.lineCount === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </Rows>
        </CategoryCard>
        )}

        {/* --- Depots --- */}
        {canDepots && (
        <CategoryCard
          title="Depots"
          subtitle="Registrations awaiting credit approval"
          icon={Store}
          tone="bg-violet-50 text-violet-600"
          count={depots.data?.totalCount ?? null}
          loading={depots.isLoading}
          href="/approval/depots"
        >
          <Rows
            loading={depots.isLoading}
            error={depots.error}
            empty={(depots.data?.items.length ?? 0) === 0}
            emptyLabel="No depots awaiting approval"
          >
            {depots.data?.items.map((d) => (
              <Link
                key={d.id}
                href={`/approval/depots/${d.id}`}
                className="block px-5 py-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                    {d.name}
                  </span>
                  {/* Incomplete paperwork is the single reason a depot approval stalls,
                      so it is on the card rather than one click away. */}
                  {!d.documentsComplete && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 flex-shrink-0">
                      <AlertTriangle size={10} />
                      {d.missingRequiredDocuments.length || 'docs'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {[d.code, d.city].filter(Boolean).join(' · ') || 'No code or city'}
                </p>
              </Link>
            ))}
          </Rows>
        </CategoryCard>
        )}

        {/* --- Promotions & Discounts --- */}
        {canSales && (
        <CategoryCard
          title="Promotions & Discounts"
          subtitle="Depot agreements moving through four signatures"
          icon={BadgePercent}
          tone="bg-amber-50 text-amber-600"
          count={promotions.isLoading ? null : inChain.length}
          loading={promotions.isLoading}
          href="/promotions"
        >
          <Rows
            loading={promotions.isLoading}
            error={promotions.error}
            empty={inChain.length === 0}
            emptyLabel="No promotions awaiting a signature"
          >
            {inChain.slice(0, PREVIEW_ROWS).map((row) => (
              <Link
                key={row.id}
                href={`/promotions/${row.id}`}
                className="block px-5 py-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                    {row.code}
                    {row.versionNumber != null && (
                      <span className="ml-1 text-[10px] text-gray-400">v{row.versionNumber}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {row.status === 'UnderFinanceReview' ? 'finance' : 'commercial'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {row.name} · {typeLabel(row)}
                </p>
              </Link>
            ))}
          </Rows>
        </CategoryCard>
        )}
      </div>

      {visibleCount === 0 && (
        <Card className="border-gray-100 card-shadow p-10 text-center" style={{ borderRadius: '18px' }}>
          <CheckCircle2 size={20} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">You do not have approval rights in any area.</p>
          <p className="text-[11.5px] text-gray-400 mt-1">
            Approving quotations and discounts needs <span className="font-mono">sales.manage</span>; approving
            depots needs <span className="font-mono">customers.manage</span>.
          </p>
        </Card>
      )}

      {/* Stated once, where somebody reading the numbers can see it. */}
      {inChain.length >= AGREEMENT_SCAN && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <FileText size={11} />
          The promotions count is taken from the most recent {AGREEMENT_SCAN} requests, so it may understate a
          longer backlog. Open the queue for the full list.
        </p>
      )}
    </div>
  );
}
