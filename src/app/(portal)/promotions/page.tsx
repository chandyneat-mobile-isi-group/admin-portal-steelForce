'use client';

/**
 * Promotions — the discount catalogue.
 *
 * Replaces the depot-agreement queue this page used to show. Every discount the business
 * gives is now a promotion row: conditions, a reward, validity and a SAP mapping, taken
 * through a two-stage approval before it goes live.
 *
 * ## Two states per row, deliberately
 *
 * A promotion can have a **live** version and an **open** one being worked on at the same
 * time, because editing a live discount creates a new version rather than changing what
 * was approved. Showing only the open version's status would report a promotion as Draft
 * while customers are being charged under it today, so the live version number is shown
 * beside it whenever the two differ.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  BadgePercent,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Settings2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  PROMOTION_STATUSES,
  byCatalogOrder,
  typeLabel,
  usePromotionConditions,
  usePromotionTypes,
  StatusChip,
  rewardLabel,
  useExportPromotions,
  usePromotions,
  type PromotionListItemDto,
} from '@/features/promotions';
import { PromotionImportPanel } from '@/features/promotions/components/import-panel';
import { CreatePromotionDialog } from './create-promotion-dialog';
import { useAuth } from '@/lib/auth/auth-context';

function when(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'd MMM yyyy');
}

export default function PromotionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [conditionCode, setConditionCode] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const { can } = useAuth();
  // Inactive types stay in the filter so promotions that still use them can be found.
  const types = usePromotionTypes(true);
  const conditionCatalog = usePromotionConditions(true);
  const sortedTypes = useMemo(() => [...(types.data ?? [])].sort(byCatalogOrder), [types.data]);
  const sortedConditions = useMemo(() => [...(conditionCatalog.data ?? [])].sort(byCatalogOrder), [conditionCatalog.data]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const exporter = useExportPromotions();

  const query = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(businessType ? { businessType } : {}),
      ...(conditionCode ? { dimension: conditionCode } : {}),
      ...(conditionCode && conditionValue.trim() ? { value: conditionValue.trim().toUpperCase() } : {}),
    }),
    [search, status, businessType, conditionCode, conditionValue]
  );

  const { data, isLoading, isError, error } = usePromotions(query);

  const rows: PromotionListItemDto[] = data?.items ?? [];
  const liveCount = rows.filter((row) => row.status === 'Active').length;
  const awaiting = rows.filter(
    (row) => row.status === 'UnderCommercialReview' || row.status === 'UnderFinanceReview'
  ).length;

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold text-main">Promotions &amp; discounts</h1>
          <p className="text-[12px] text-muted-foreground">
            {data?.totalCount ?? 0} configured · {liveCount} live · {awaiting} awaiting a signature
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Exports what the filters currently show, not the whole catalogue — the
              file matches the screen it was taken from, which is also what makes
              "export, edit, upload back" a safe way to change a handful of rows. */}
          <button
            onClick={() =>
              exporter
                .mutateAsync(query)
                .catch((err: unknown) =>
                  toast.error('Could not export the catalogue', {
                    description: err instanceof Error && err.message ? err.message : 'The server refused the request.',
                  })
                )
            }
            disabled={exporter.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface text-[12.5px] font-medium disabled:opacity-60"
          >
            {exporter.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
            {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
          </button>
          {can('promotions.configure') && (
            <Link
              href="/promotions/configuration/types"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface text-[12.5px] font-medium hover:bg-accent/40"
            >
              <Settings2 size={14} /> Configuration
            </Link>
          )}
          <button
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface text-[12.5px] font-medium"
          >
            <Upload size={14} /> Import
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[12.5px] font-medium"
          >
            <Plus size={14} /> New promotion
          </button>
        </div>
      </div>

      <Card className="p-3 rounded-card border-surface card-shadow">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code or name"
              className="w-full text-[12.5px] rounded-xl border border-surface pl-9 pr-3 py-2 bg-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
          >
            <option value="">Any status</option>
            {PROMOTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/([a-z])([A-Z])/g, '$1 $2')}
              </option>
            ))}
          </select>
          <select
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            className="text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
          >
            <option value="">Any type</option>
            {sortedTypes.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}
                {type.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
          {/* Find by condition: the server matches the condition code, and the value
              when one is given. */}
          <div className="flex items-center rounded-xl border border-surface">
            <select
              value={conditionCode}
              onChange={(event) => setConditionCode(event.target.value)}
              className="text-[12.5px] rounded-l-xl px-3 py-2 bg-transparent"
            >
              <option value="">Any condition</option>
              {sortedConditions.map((def) => (
                <option key={def.id} value={def.code}>
                  {def.name}
                  {def.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {conditionCode && (
              <input
                value={conditionValue}
                onChange={(event) => setConditionValue(event.target.value)}
                placeholder="Value, e.g. TCOD"
                className="w-36 text-[12.5px] border-l border-surface px-3 py-2 bg-transparent uppercase"
              />
            )}
          </div>
        </div>
      </Card>

      <Card className="p-0 rounded-card border-surface card-shadow overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeader title="Catalogue" icon={BadgePercent} count={rows.length} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-[13px] py-14">
            <Loader2 size={15} className="animate-spin" /> Loading promotions…
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2.5 px-5 pb-5">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] text-muted-foreground break-words">
              {error instanceof Error ? error.message : 'The catalogue could not be loaded.'}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground px-5 pb-5">
            No promotions match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-surface">
                  <th className="font-medium px-5 py-2">Code</th>
                  <th className="font-medium px-3 py-2">Name</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Reward</th>
                  <th className="font-medium px-3 py-2">Valid</th>
                  <th className="font-medium px-3 py-2">SAP</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="px-3 py-2" aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  // The whole row opens the promotion, not just the code. The code stays a
                  // real link so it can be opened in a new tab or reached by keyboard.
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/promotions/${row.id}`)}
                    className="group cursor-pointer border-b border-surface last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/promotions/${row.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-[12.5px] font-medium text-primary whitespace-nowrap hover:underline"
                      >
                        {row.code}
                      </Link>
                      {row.versionNumber != null && (
                        <span className="text-[10.5px] text-muted-foreground ml-1.5">v{row.versionNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-main">{row.name}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                      {typeLabel(row)}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-main whitespace-nowrap">{rewardLabel(row)}</td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {when(row.validFrom)} – {when(row.validTo)}
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {row.sapConditionType ?? '—'}
                      {row.sapStatus && row.sapStatus !== 'NotSynced' && (
                        <span className="block text-[10.5px]">{row.sapStatus}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={row.status} />
                      {/* A live version behind an open one. Without this the row reads
                          as Draft while the discount is being given. */}
                      {row.liveVersionNumber != null && row.liveVersionNumber !== row.versionNumber && (
                        <span className="block text-[10.5px] text-emerald-700 mt-0.5">
                          v{row.liveVersionNumber} live
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-muted-foreground group-hover:text-primary whitespace-nowrap">
                        View <ChevronRight size={13} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && <CreatePromotionDialog onClose={() => setCreating(false)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </PageBody>
  );
}

/**
 * The import panel in a dialog.
 *
 * A dialog rather than its own route because bulk editing starts from looking at the
 * catalogue — you export what is on screen, change it, and put it back. Sending that
 * round trip through a separate page loses the filters it began with.
 */
function ImportDialog({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import promotions"
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-4xl rounded-card bg-background border border-surface shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface">
          <div>
            <p className="text-[13.5px] font-semibold text-main">Import promotions</p>
            <p className="text-[11.5px] text-muted-foreground">
              Create or update many at once from a spreadsheet. Everything lands as a draft.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-main">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">
          <PromotionImportPanel compact />
        </div>
      </div>
    </div>,
    document.body
  );
}
