'use client';

/**
 * Bulk depot assignment by spreadsheet — download the template, upload the filled file.
 *
 * ## Why this is a component and not just a page
 *
 * Planners do this work on the **Assignment Board**, where they are already looking at
 * who is covering what. It used to exist only as a separate screen under Depots, which
 * meant the bulk path was invisible from the place the same rows are created by hand. It
 * is now both: the standalone page and a dialog on the board, sharing one implementation
 * so the validation rules and the result panel cannot drift apart.
 *
 * ## The one thing this must not get wrong
 *
 * The import is **all-or-nothing**. When it is refused, `successfulRows` may still read
 * 94 — those are rows that *passed validation*, not rows that were saved. A result panel
 * that led with that number would tell somebody 94 assignments exist when none do. So the
 * outcome banner is driven by `imported`, and the counts sit underneath it, explicitly
 * labelled as "would import" until they actually did.
 *
 * ## What an assignment is
 *
 * A depot on a representative's day for a date — the same row the planning board writes
 * when a depot is dragged onto a column. It is not a change of depot ownership.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useDownloadErrorReport,
  useDownloadTemplate,
  recordImport,
  useImportAssignments,
  type ImportResultDto,
} from '@/features/depot-assignments';

/** Mirrors the server's cap, so an oversized file is refused before it is read. */
const MAXIMUM_BYTES = 5 * 1024 * 1024;

function describe(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'The server refused the request.';
}

export function DepotAssignmentImportPanel({ compact = false }: { compact?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResultDto | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const template = useDownloadTemplate();
  const importer = useImportAssignments();
  const report = useDownloadErrorReport();

  const choose = (picked: File | null) => {
    if (!picked) return;

    if (!/\.(csv|xlsx)$/i.test(picked.name)) {
      toast.error('That is not a .csv or .xlsx file', {
        description: 'Save the sheet as CSV (or .xlsx) and try again — .xls is not read.',
      });
      return;
    }

    if (picked.size > MAXIMUM_BYTES) {
      toast.error('That file is too large', { description: 'The limit is 5 MB. Split it and import in parts.' });
      return;
    }

    setFile(picked);
    // A new file makes the previous outcome meaningless, and leaving it on screen beside
    // a different filename is how somebody reads last upload's result as this one's.
    setResult(null);
  };

  const upload = () => {
    if (!file) return;

    importer
      .mutateAsync(file)
      .then((outcome) => {
        setResult(outcome);
        recordImport(file, outcome);

        if (outcome.imported) {
          toast.success(`Imported ${outcome.stopsCreated} depot call(s)`, {
            description: `${outcome.routesCreated} new route(s) created.`,
          });
        } else {
          toast.error(`${outcome.failedRows} row(s) need fixing`, {
            description: 'Nothing was saved. Correct the file and upload it again.',
          });
        }
      })
      .catch((err: unknown) => {
        setResult(null);
        recordImport(file, null, describe(err));
        toast.error('The file could not be imported', { description: describe(err) });
      });
  };

  return (
    <div className="space-y-5">
      {/* Said once: "assignment" invites the wrong reading on both surfaces. */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
        <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-gray-600 leading-relaxed">
          <span className="font-600" style={{ fontWeight: 600 }}>
            An assignment here puts a depot on a representative&apos;s route for a date
          </span>{' '}
          — the same stop a planner creates by assigning a depot to someone. It does not change which representative owns the depot
          relationship.
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${compact ? '' : 'lg:grid-cols-2'}`}>
        {/* Step 1 */}
        <Card className="border-gray-100 card-shadow p-5" style={{ borderRadius: '18px' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13.5px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                1. Download the template
              </h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                A CSV with the columns to fill and example rows for the coming week, using representative
                and depot codes that exist right now. Opens in Excel.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-[12px] mt-3"
                disabled={template.isPending}
                onClick={() =>
                  template
                    .mutateAsync()
                    .catch((err: unknown) =>
                      toast.error('Could not download the template', { description: describe(err) })
                    )
                }
              >
                {template.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Download size={14} className="mr-1.5" /> Download CSV template
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Step 2 */}
        <Card className="border-gray-100 card-shadow p-5" style={{ borderRadius: '18px' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13.5px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                2. Upload the completed file
              </h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                Everything is checked before anything is saved. One bad row means nothing is imported.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => choose(e.target.files?.[0] ?? null)}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  choose(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => inputRef.current?.click()}
                className={`mt-3 rounded-xl border border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-violet-400 bg-violet-50/60' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet size={14} className="text-violet-500 flex-shrink-0" />
                    <span className="text-[12px] text-gray-900 truncate">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      aria-label="Remove file"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-gray-400">Drop the .csv or .xlsx here, or click to choose</p>
                )}
              </div>

              <Button
                size="sm"
                className="rounded-xl text-[12px] mt-3 w-full"
                disabled={!file || importer.isPending}
                onClick={upload}
              >
                {importer.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Validating and importing…
                  </>
                ) : (
                  'Upload and import'
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {result && <ImportResult result={result} file={file} report={report} />}
    </div>
  );
}

function ImportResult({
  result,
  file,
  report,
}: {
  result: ImportResultDto;
  file: File | null;
  report: ReturnType<typeof useDownloadErrorReport>;
}) {
  const ok = result.imported;

  return (
    <Card className="border-gray-100 card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
      {/* Driven by `imported`, not by the counts — see the note at the top of the file. */}
      <div
        className={`flex items-start gap-2.5 px-5 py-4 border-b ${
          ok ? 'bg-green-50/60 border-green-100' : 'bg-red-50/50 border-red-100'
        }`}
      >
        {ok ? (
          <CheckCircle2 size={17} className="text-green-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle size={17} className="text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
            {ok
              ? `Imported — ${result.stopsCreated} depot call(s) across ${result.routesCreated} new route(s)`
              : 'Nothing was imported'}
          </p>
          <p className="text-[11.5px] text-gray-600 mt-0.5">
            {ok
              ? 'The assignments are live and will reach the representatives’ handsets.'
              : `${result.failedRows} of ${result.totalRows} rows need fixing. The whole file is rejected together, so no assignments were created — correct these rows and upload again.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-100">
        {[
          { label: 'Total rows', value: result.totalRows, tone: 'text-gray-900' },
          {
            // Labelled by outcome: "passed validation" is not "saved" unless it imported.
            label: ok ? 'Imported' : 'Would import',
            value: result.successfulRows,
            tone: ok ? 'text-green-600' : 'text-gray-400',
          },
          { label: 'Failed', value: result.failedRows, tone: result.failedRows > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map((stat) => (
          <div key={stat.label} className="px-5 py-3">
            <p className="text-[11px] text-gray-400">{stat.label}</p>
            <p className={`text-[20px] font-700 tabular-nums ${stat.tone}`} style={{ fontWeight: 700 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {result.errors.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
            <h3 className="text-[12.5px] font-600 text-gray-900" style={{ fontWeight: 600 }}>
              Rows to fix
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[11.5px]"
              disabled={!file || report.isPending}
              onClick={() =>
                file &&
                report
                  .mutateAsync(file)
                  .catch((err: unknown) =>
                    toast.error('Could not build the error report', { description: describe(err) })
                  )
              }
            >
              {report.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Download size={13} className="mr-1.5" /> Download error report
                </>
              )}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Row', 'Assignment date', 'Sales rep', 'Depot', 'Problem'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-2.5 text-[11px] font-600 text-gray-400"
                      style={{ fontWeight: 600 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.errors.map((error) => (
                  <tr key={error.row} className="border-b border-gray-50 last:border-0">
                    {/* The worksheet row number, so it can be typed straight into Excel's
                        go-to box rather than counted down the list. */}
                    <td className="px-5 py-2.5 text-[12px] font-mono text-gray-500">{error.row}</td>
                    <td className="px-5 py-2.5 text-[12px] text-gray-700">
                      {error.assignmentDate || <span className="text-gray-300">blank</span>}
                    </td>
                    <td className="px-5 py-2.5 text-[12px] text-gray-700">
                      {error.salesRepCode || <span className="text-gray-300">blank</span>}
                      {error.salesRepName && (
                        <span className="block text-[10.5px] text-gray-400">{error.salesRepName}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-[12px] text-gray-700">
                      {error.depotCode || <span className="text-gray-300">blank</span>}
                      {error.depotName && (
                        <span className="block text-[10.5px] text-gray-400">{error.depotName}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-[12px] text-red-600">
                      <span className="inline-flex items-start gap-1.5">
                        <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                        {error.message}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {ok && (
        <Link
          href="/planning/calendar"
          className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-[12px] text-primary hover:bg-gray-50/70 transition-colors"
        >
          View the imported calls on the calendar
          <ArrowRight size={14} />
        </Link>
      )}
    </Card>
  );
}
