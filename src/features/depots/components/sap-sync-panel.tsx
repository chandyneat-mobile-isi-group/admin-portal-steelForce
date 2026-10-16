'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CloudDownload, CloudUpload, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/feedback';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDate } from '@/lib/formatting';
import { depotsRepository } from '../repositories';

/**
 * The SAP boundary, as one panel.
 *
 * <b>Pull and push are not the same kind of act, and are not presented as one.</b>
 * Pulling master data down overwrites nothing an operator typed and is safe to repeat,
 * so it is a plain button. Pushing registrations up <em>creates records in the ERP</em>
 * and cannot be undone from here, so it asks first and says how many it is about to
 * send. A single "Sync" button that did both would make the reversible and the
 * irreversible feel identical.
 *
 * Every action needs `customers.sync`; without it the panel does not render at all
 * rather than showing buttons that will 403.
 */
export function SapSyncPanel({ onSynced }: { onSynced?: () => void } = {}) {
  const { can } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmPush, setConfirmPush] = useState(false);

  const maySync = can('customers.sync');

  const loadStatus = useCallback(
    (signal: AbortSignal) => depotsRepository.sap.status(signal),
    []
  );
  const { data: status, refetch } = useRepositoryQuery(['depots', 'sap-status'], loadStatus, maySync);

  if (!maySync) return null;

  const run = async (label: string, action: () => Promise<void>, done: string) => {
    setBusy(label);
    try {
      await action();
      toast.success(done);
      refetch();
      // Pushes and retries change depot records, so a list beside the panel re-reads.
      onSynced?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SAP synchronisation failed.');
    } finally {
      setBusy(null);
    }
  };

  const pending = status?.pending ?? 0;
  const rejected = status?.rejected ?? 0;

  return (
    <div className="rounded-card border border-surface bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="isi-eyebrow">SAP</p>
          <h2 className="mt-1 text-[14px] font-bold text-foreground">Master data synchronisation</h2>
          {status ? (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {status.registered.toLocaleString()} registered · {pending.toLocaleString()} pending ·{' '}
              {rejected.toLocaleString()} rejected · {status.notSubmitted.toLocaleString()} not submitted
              {status.lastPulledAt && <> · last pulled {formatDate(status.lastPulledAt.slice(0, 10))}</>}
            </p>
          ) : (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Checking SAP status…</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              run('pull', () => depotsRepository.sap.pullMasterData(), 'Master data pulled from SAP.')
            }
            className="rounded-md"
          >
            <CloudDownload size={14} className="mr-1.5" />
            {busy === 'pull' ? 'Pulling…' : 'Pull from SAP'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              run('refs', () => depotsRepository.sap.pullReferences(), 'Reference data refreshed.')
            }
            className="rounded-md"
          >
            <RefreshCw size={14} className="mr-1.5" />
            {busy === 'refs' ? 'Refreshing…' : 'Refresh catalogues'}
          </Button>

          {/* Creates records in the ERP, so it confirms and names the count. */}
          <Button
            size="sm"
            disabled={busy !== null || pending === 0}
            onClick={() => setConfirmPush(true)}
            className="rounded-md gradient-primary text-white border-0"
          >
            <CloudUpload size={14} className="mr-1.5" />
            Push {pending > 0 ? `${pending} ` : ''}to SAP
          </Button>

          {rejected > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                run('retry', () => depotsRepository.sap.retryRejected(), `${rejected} re-queued.`)
              }
              className="rounded-md"
            >
              <RotateCcw size={14} className="mr-1.5" />
              {busy === 'retry' ? 'Re-queuing…' : `Retry ${rejected} rejected`}
            </Button>
          )}
        </div>
      </div>

      {/* The number that actually matters: a submission waiting days means the push
          has not been run, which no count on its own reveals. */}
      {status?.oldestPendingAt && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-surface pt-3 text-[11.5px] text-amber-700 dark:text-amber-400">
          <AlertTriangle size={13} />
          Oldest submission still waiting since {formatDate(status.oldestPendingAt.slice(0, 10))}.
        </p>
      )}

      <ConfirmDialog
        open={confirmPush}
        title="Push registrations to SAP?"
        body={`This creates ${pending} customer record${pending === 1 ? '' : 's'} in SAP. It cannot be undone from this portal.`}
        confirmLabel="Push to SAP"
        tone="primary"
        icon={CloudUpload}
        onCancel={() => setConfirmPush(false)}
        onConfirm={() => {
          setConfirmPush(false);
          void run('push', () => depotsRepository.sap.pushPending(), 'Pending registrations pushed to SAP.');
        }}
      />
    </div>
  );
}
