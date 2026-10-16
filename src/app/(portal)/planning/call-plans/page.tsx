'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, FileSpreadsheet, Flag, History, Trash2, XCircle } from 'lucide-react';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/feedback/feedback';
import { DepotAssignmentImportPanel } from '@/features/depot-assignments/components/import-panel';
import { useImportHistory, type ImportOutcome } from '@/features/depot-assignments';

const OUTCOME_LOOK: Record<ImportOutcome, { icon: typeof CheckCircle2; className: string; label: string }> = {
  Imported: { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', label: 'Imported' },
  Refused: { icon: XCircle, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', label: 'Rows to fix' },
  Failed: { icon: XCircle, className: 'bg-red-500/10 text-red-700 dark:text-red-300', label: 'Failed' },
};

const OUTCOME_OPTIONS = (Object.keys(OUTCOME_LOOK) as ImportOutcome[]).map((o) => ({
  value: o,
  label: OUTCOME_LOOK[o].label,
}));

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Import call plans onto reps' routes, and see every import made from this browser. */
export default function CallPlansPage() {
  return (
    <PageBody>
      <DepotAssignmentImportPanel />
      <ImportHistory />
    </PageBody>
  );
}

function ImportHistory() {
  const { entries, clear } = useImportHistory();
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('All');
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (outcome === 'All' || e.outcome === outcome) &&
        (!q || `${e.fileName} ${e.uploadedBy}`.toLowerCase().includes(q))
    );
  }, [entries, search, outcome]);

  const imported = entries.filter((e) => e.outcome === 'Imported');
  const summary = {
    uploads: entries.length,
    imported: imported.length,
    stops: imported.reduce((n, e) => n + e.stopsCreated, 0),
    routes: imported.reduce((n, e) => n + e.routesCreated, 0),
  };

  return (
    <Card className="p-5 rounded-card border-surface card-shadow">
      <SectionHeader
        title="Import history"
        subtitle="Every call plan upload made from this browser"
        icon={History}
        count={entries.length}
        action={
          entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 size={13} className="mr-1.5" /> Clear
            </Button>
          )
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={History} title="No imports yet" hint="Upload a filled template above and it will be listed here." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'Uploads', value: summary.uploads },
              { label: 'Imported', value: summary.imported },
              { label: 'Calls added', value: summary.stops },
              { label: 'Routes created', value: summary.routes },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-[17px] font-bold text-main tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchBar value={search} onChange={setSearch} placeholder="Search file or uploader…" className="w-full sm:w-[260px]" />
            <FilterChip label="Result" icon={Flag} value={outcome} options={OUTCOME_OPTIONS} onChange={setOutcome} allLabel="All results" />
            <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
              {rows.length} of {entries.length}
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={History} title="No imports match these filters" />
          ) : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full min-w-[820px] text-[12px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-semibold py-2 px-2">Uploaded</th>
                    <th className="text-left font-semibold py-2 px-2">File</th>
                    <th className="text-left font-semibold py-2 px-2">By</th>
                    <th className="text-right font-semibold py-2 px-2">Rows</th>
                    <th className="text-right font-semibold py-2 px-2">Failed</th>
                    <th className="text-right font-semibold py-2 px-2">Calls added</th>
                    <th className="text-right font-semibold py-2 px-2">Routes</th>
                    <th className="text-left font-semibold py-2 px-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const look = OUTCOME_LOOK[e.outcome];
                    return (
                      <tr key={e.id} className="border-b border-surface last:border-0 hover:bg-accent/20">
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-main tabular-nums">
                            <Clock size={12} className="text-muted-foreground" />
                            {format(new Date(e.at), 'd MMM yyyy, HH:mm')}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-1.5 font-medium text-main">
                            <FileSpreadsheet size={13} className="text-emerald-600" />
                            <span className="truncate max-w-[220px]" title={e.fileName}>{e.fileName}</span>
                          </span>
                          <span className="block pl-5 text-[10.5px] text-muted-foreground">{fileSize(e.fileSize)}</span>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">{e.uploadedBy}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{e.totalRows || '—'}</td>
                        <td className={`py-2.5 px-2 text-right tabular-nums ${e.failedRows ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          {e.failedRows || '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{e.stopsCreated || '—'}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{e.routesCreated || '—'}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${look.className}`}>
                            <look.icon size={11} /> {look.label}
                          </span>
                          {e.message && (
                            <span className="block mt-0.5 text-[10.5px] text-muted-foreground truncate max-w-[200px]" title={e.message}>
                              {e.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground">
            Kept in this browser only — imports made by colleagues or on another device are not listed.
          </p>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear import history?"
        onCancel={() => setConfirmClear(false)}
        body="This only removes the list in this browser. Imported call plans stay on the routes."
        confirmLabel="Clear history"
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
      />
    </Card>
  );
}
