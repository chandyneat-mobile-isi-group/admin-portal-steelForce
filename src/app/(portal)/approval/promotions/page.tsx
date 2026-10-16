'use client';

/**
 * Promotions awaiting a signature.
 *
 * This page used to render a hardcoded list of "discount requests" with invented clients,
 * reps and percentages — the depot-agreement design, and mock even for that. It now reads
 * the promotion catalogue filtered to the two states that mean somebody still has to sign.
 *
 * ## Two queues, not one
 *
 * Commercial and Finance are different people with different permissions, and a promotion
 * sits in exactly one of their queues. Merging them into a single "pending" list would
 * show every approver work that is not theirs, and the server would refuse it — so the
 * split is the honest shape.
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, BadgePercent, Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  rewardLabel,
  typeLabel,
  usePromotions,
  type PromotionListItemDto,
} from '@/features/promotions';

function when(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'd MMM yyyy');
}

function Queue({
  title,
  subtitle,
  rows,
  isLoading,
}: {
  title: string;
  subtitle: string;
  rows: PromotionListItemDto[];
  isLoading: boolean;
}) {
  return (
    <Card className="p-5 rounded-card border-surface card-shadow">
      <SectionHeader title={title} subtitle={subtitle} icon={ShieldCheck} count={rows.length} />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-[12.5px] py-6">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">Nothing waiting here.</p>
      ) : (
        <ul className="divide-y divide-surface">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <Link href={`/promotions/${row.id}`} className="block text-[12.5px] font-medium text-primary truncate">
                  {row.code} · {row.name}
                </Link>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {typeLabel(row)} · {rewardLabel(row)} ·{' '}
                  {when(row.validFrom)} – {when(row.validTo)}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                v{row.versionNumber ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PromotionApprovalsPage() {
  const commercial = usePromotions({ status: 'UnderCommercialReview' });
  const finance = usePromotions({ status: 'UnderFinanceReview' });

  const commercialRows = commercial.data?.items ?? [];
  const financeRows = finance.data?.items ?? [];
  const failed = commercial.isError || finance.isError;

  return (
    <PageBody>
      <div>
        <h1 className="text-[17px] font-semibold text-main">Promotion approvals</h1>
        <p className="text-[12px] text-muted-foreground">
          {commercialRows.length + financeRows.length} version
          {commercialRows.length + financeRows.length === 1 ? '' : 's'} awaiting a signature
        </p>
      </div>

      {failed && (
        <Card className="p-4 rounded-card border-rose-200 bg-rose-50/60">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] text-rose-900">
              The approval queues could not be loaded.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Queue
          title="Commercial review"
          subtitle="Stage 1 — is this a discount the business wants to offer?"
          rows={commercialRows}
          isLoading={commercial.isLoading}
        />
        <Queue
          title="Finance review"
          subtitle="Stage 2 — the margin call, and the last signature before activation"
          rows={financeRows}
          isLoading={finance.isLoading}
        />
      </div>

      <Card className="p-5 rounded-card border-surface card-shadow">
        <SectionHeader title="Approved, not yet live" icon={BadgePercent} />
        <ApprovedNotLive />
      </Card>
    </PageBody>
  );
}

/**
 * The gap people forget.
 *
 * A version can carry both signatures and still price nothing, because activation is a
 * separate act. Left off this page, an approved-but-inactive promotion is invisible —
 * everyone assumes the second signature finished the job.
 */
function ApprovedNotLive() {
  const { data, isLoading } = usePromotions({ status: 'Approved' });
  const rows = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-[12.5px]">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-[12.5px] text-muted-foreground">Nothing approved is waiting to be switched on.</p>;
  }

  return (
    <ul className="divide-y divide-surface">
      {rows.map((row) => (
        <li key={row.id} className="py-2.5 flex items-center gap-3">
          <Link href={`/promotions/${row.id}`} className="min-w-0 flex-1 text-[12.5px] text-primary truncate">
            {row.code} · {row.name}
          </Link>
          <span className="text-[11px] text-amber-700 whitespace-nowrap">needs activation</span>
        </li>
      ))}
    </ul>
  );
}
