'use client';

/**
 * SAP synchronisation console.
 *
 * ## The distinction this panel exists to make visible
 *
 * There are two shapes of sync and they behave nothing alike:
 *
 * - **Refresh everything** queues three background jobs and returns `202` with their
 *   ids, immediately. It reports *nothing about the outcome* — the catalogue is still
 *   stale the moment the button returns, and stays so for about five minutes.
 * - **The three individual syncs** run inline and return real counts, but the material
 *   master takes roughly four minutes of held-open request to do it.
 *
 * A single "Sync" button covering both would be a lie in one direction or the other:
 * either it returns instantly and people believe the data is fresh, or it hangs for
 * four minutes and people believe it has crashed. So the queued action is the primary
 * one, the blocking ones are labelled with what they cost, and the queued action's
 * result is worded as *accepted*, never as *done*.
 *
 * ## Why failures here are expected rather than exceptional
 *
 * SAP lives on an internal address. Off that network every one of these calls times
 * out, which is not a bug in the portal and should not be reported as one — so a
 * timeout gets its own message naming SAP rather than a generic "something went wrong".
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Warehouse,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSyncAll, useSyncOne, useSyncStatus, type SyncSummaryDto } from '@/features/materials';
import { formatDistanceToNow } from 'date-fns';

/** Turns whatever the client threw into something that names the likely cause. */
function describeFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : '';

  if (/abort|timeout|timed out|network/i.test(message)) {
    return 'SAP did not answer in time. It is reachable only from the internal network — check the VPN or run this from the office.';
  }

  return message || 'The server refused the request.';
}

function SummaryLine({ result }: { result: SyncSummaryDto }) {
  return (
    <div className="mt-2 p-2.5 rounded-xl bg-gray-50 text-[11px] text-gray-600 space-y-0.5">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span>
          <span className="font-600" style={{ fontWeight: 600 }}>
            {result.inserted}
          </span>{' '}
          inserted
        </span>
        <span>
          <span className="font-600" style={{ fontWeight: 600 }}>
            {result.updated}
          </span>{' '}
          updated
        </span>
        {result.removed != null && (
          <span>
            <span className="font-600" style={{ fontWeight: 600 }}>
              {result.removed}
            </span>{' '}
            removed
          </span>
        )}
        {result.skipped > 0 && <span className="text-amber-600">{result.skipped} skipped</span>}
        <span className="text-gray-400">
          {result.total} of {result.sapTotalCount ?? result.total} rows ·{' '}
          {(result.durationMs / 1000).toFixed(1)}s
        </span>
      </div>
      {/* A partial run is the one outcome that needs acting on, so it is called out
          rather than left to be inferred from two numbers not matching. */}
      {result.isPartial && (
        <p className="text-amber-600 flex items-center gap-1 pt-0.5">
          <AlertTriangle size={11} /> Partial — fewer rows were read than SAP holds. Run it again to finish.
        </p>
      )}
    </div>
  );
}

function lastRun(at: string | null | undefined): string {
  return at ? `Last run ${formatDistanceToNow(new Date(at), { addSuffix: true })}` : 'Never run';
}

function SyncRow({
  title,
  description,
  cost,
  icon: Icon,
  busy,
  onRun,
  result,
  lastSyncedAt,
}: {
  title: string;
  description: string;
  cost: string;
  icon: typeof Package;
  busy: boolean;
  onRun: () => void;
  result?: SyncSummaryDto;
  lastSyncedAt?: string | null;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-600 text-gray-900" style={{ fontWeight: 600 }}>
              {title}
            </p>
            <p className="text-[11.5px] text-gray-400 mt-0.5">{description}</p>
            <p className="text-[10.5px] text-gray-400 mt-0.5">{cost}</p>
            {lastSyncedAt !== undefined && (
              <p className="text-[10.5px] text-gray-500 mt-0.5">{lastRun(lastSyncedAt)}</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-[11.5px] flex-shrink-0"
          disabled={busy}
          onClick={onRun}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : 'Run'}
        </Button>
      </div>
      {result && <SummaryLine result={result} />}
    </div>
  );
}

export function SapSyncPanel() {
  const syncAll = useSyncAll();
  const syncOne = useSyncOne();
  const status = useSyncStatus().data;

  const [results, setResults] = useState<Record<string, SyncSummaryDto>>({});
  const [running, setRunning] = useState<string | null>(null);

  const runOne = (kind: 'materials' | 'stock' | 'references') => {
    setRunning(kind);

    syncOne
      .mutateAsync({ kind })
      .then((summary) => {
        setResults((prev) => ({ ...prev, [kind]: summary }));
        toast[summary.success ? 'success' : 'warning'](
          summary.success ? 'Sync finished' : 'Sync finished with problems',
          { description: `${summary.inserted} inserted, ${summary.updated} updated.` }
        );
      })
      .catch((err: unknown) => toast.error('Sync failed', { description: describeFailure(err) }))
      .finally(() => setRunning(null));
  };

  return (
    <Card className="border-gray-100 card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
      <div className="flex items-start gap-2.5 px-5 py-4 border-b border-gray-100">
        <Database size={16} className="text-gray-400 mt-0.5" />
        <div>
          <h2 className="text-[13.5px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
            SAP synchronisation
          </h2>
          <p className="text-[11.5px] text-gray-400 mt-0.5">
            The catalogue is a copy of SAP&apos;s. These pull it again — safe to run twice, since every sync
            updates on the material number rather than duplicating.
          </p>
        </div>
      </div>

      {/* The queued refresh: primary, because it is the one that does not hold a
          request open for four minutes. */}
      <div className="px-5 py-4 bg-blue-50/40 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Zap size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-600 text-gray-900" style={{ fontWeight: 600 }}>
                Refresh everything
              </p>
              <p className="text-[11.5px] text-gray-500 mt-0.5">
                Queues all three syncs in dependency order and returns straight away.
              </p>
              <p className="text-[10.5px] text-gray-400 mt-0.5">
                Background · about five minutes · reports no counts
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-xl text-[11.5px] flex-shrink-0"
            disabled={syncAll.isPending}
            onClick={() =>
              syncAll
                .mutateAsync()
                .then((queued) =>
                  // Deliberately "queued", not "synced". Nothing has been refreshed yet.
                  toast.success('Synchronisation queued', {
                    description: `${queued.message} Job ids: ${queued.referencesJobId.slice(0, 8)}…, ${queued.materialsJobId.slice(0, 8)}…, ${queued.stockJobId.slice(0, 8)}…`,
                  })
                )
                .catch((err: unknown) =>
                  toast.error('Could not queue the refresh', { description: describeFailure(err) })
                )
            }
          >
            {syncAll.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <>
                <RefreshCw size={13} className="mr-1.5" /> Refresh
              </>
            )}
          </Button>
        </div>

        {syncAll.isSuccess && (
          <p className="mt-2 text-[11px] text-gray-500 flex items-start gap-1.5">
            <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
            Accepted and running in the background. The figures on this page refresh automatically
            when it finishes, in a few seconds.
          </p>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        <SyncRow
          title="Reference catalogues"
          description="Types, groups, price groups, plants and storage locations."
          cost="Inline · seconds · one failing catalogue does not abandon the rest"
          icon={Layers}
          busy={running === 'references'}
          onRun={() => runOne('references')}
          result={results.references}
          lastSyncedAt={status?.references}
        />
        <SyncRow
          title="Material master"
          description="The full catalogue, upserted on the SAP material number."
          cost="Inline · a few seconds for the full catalogue · also runs nightly at 02:30 UTC"
          icon={Package}
          busy={running === 'materials'}
          onRun={() => runOne('materials')}
          result={results.materials}
          lastSyncedAt={status?.materials}
        />
        <SyncRow
          title="Stock snapshot"
          description="Quantities that rank the catalogue and hint availability."
          cost="Inline · also runs hourly · a partial read is refused rather than imported"
          icon={Warehouse}
          busy={running === 'stock'}
          onRun={() => runOne('stock')}
          result={results.stock}
          lastSyncedAt={status?.stock}
        />
      </div>

      <p className="px-5 py-3 border-t border-gray-100 text-[10.5px] text-gray-400">
        A stock snapshot never promises availability — it ranks and hints. The live answer for a single
        material is its availability check, which reads SAP at the moment you ask.
      </p>
    </Card>
  );
}
