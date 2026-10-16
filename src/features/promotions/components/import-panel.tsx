'use client';

/**
 * Bulk promotion maintenance by spreadsheet — download, fill, validate, upload.
 *
 * ## The two things this must not get wrong
 *
 * **The import is all-or-nothing.** When it is refused, `created` may still read 90 —
 * those are rows that *passed validation*, not rows that were saved. A panel that led
 * with that number would tell somebody ninety discounts exist when none do. So the
 * outcome banner is driven by `imported`, and the counts underneath are labelled "would
 * create" until they actually did.
 *
 * **Nothing imported is live.** Every promotion the file writes lands as a Draft.
 * Submitting for review, the two signatures and activation are separate acts on the
 * promotion's own page. Saying so on screen is the difference between an administrator
 * who checks the catalogue afterwards and one who assumes the discounts are being given.
 *
 * ## Validate is a first-class button, not a checkbox
 *
 * A promotion workbook carries three joined sheets, so the common failure is structural
 * — a tier whose code matches no promotion — rather than a typo in one cell. Making the
 * no-write path as prominent as the write path is what stops people learning that by
 * importing.
 */

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useDownloadPromotionErrorReport,
  useDownloadPromotionTemplate,
  useImportPromotions,
  type PromotionImportResultDto,
} from '@/features/promotions';

/** Mirrors the server's cap, so an oversized file is refused before it is uploaded. */
const MAXIMUM_BYTES = 5 * 1024 * 1024;

function describe(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'The server refused the request.';
}

export function PromotionImportPanel({ compact = false }: { compact?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PromotionImportResultDto | null>(null);
  const [wasDryRun, setWasDryRun] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const template = useDownloadPromotionTemplate();
  const importer = useImportPromotions();
  const report = useDownloadPromotionErrorReport();

  const choose = (picked: File | null) => {
    if (!picked) return;

    // The prototype's template and export are CSV; an .xlsx is accepted and answered
    // with a row telling the user to save it as CSV.
    if (!/\.(csv|xlsx)$/i.test(picked.name)) {
      toast.error('That is not a CSV workbook', {
        description: 'Save the sheet as CSV (UTF-8) and try again.',
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

  const send = (dryRun: boolean) => {
    if (!file) return;

    importer
      .mutateAsync({ file, dryRun })
      .then((outcome) => {
        setResult(outcome);
        setWasDryRun(dryRun);

        if (outcome.failedRows > 0) {
          toast.error(`${outcome.failedRows} row(s) need fixing`, {
            description: 'Nothing was saved. Correct the workbook and try again.',
          });
        } else if (dryRun) {
          toast.success('The workbook is valid', {
            description: `${outcome.created} to create, ${outcome.updated} to update. Nothing has been saved yet.`,
          });
        } else {
          toast.success(`Imported ${outcome.created + outcome.updated} promotion(s)`, {
            description: 'All saved as drafts. Submit and approve them to make them live.',
          });
        }
      })
      .catch((err: unknown) => {
        setResult(null);
        toast.error(dryRun ? 'The file could not be checked' : 'The file could not be imported', {
          description: describe(err),
        });
      });
  };

  return (
    <div className="space-y-5">
      {/* Said once, up front: the misreading this panel exists to prevent. */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
        <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-gray-600 leading-relaxed">
          <span style={{ fontWeight: 600 }}>Everything imported is saved as a draft.</span> An upload never makes
          a discount live — submitting for review, the two approvals and activation are separate steps on each
          promotion&apos;s own page. A code that already exists is updated rather than duplicated.
          <span className="block mt-1">
            The workbook holds flat conditions only. A promotion that uses a nested AND / OR rule or links to other
            promotions cannot be overwritten by import — edit it in the portal.
          </span>
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
              <h2 className="text-[13.5px] text-gray-900" style={{ fontWeight: 700 }}>
                1. Start from a workbook
              </h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                One row per promotion, with its conditions and tiers in their own columns, plus instructions.
                Exporting the catalogue gives you the same file already filled in.
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
                    <Download size={14} className="mr-1.5" /> Download blank template
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
              <h2 className="text-[13.5px] text-gray-900" style={{ fontWeight: 700 }}>
                2. Check it, then import it
              </h2>
              <p className="text-[11.5px] text-gray-400 mt-0.5">
                Everything is checked before anything is saved. One bad row anywhere means nothing is imported.
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
                  <p className="text-[11.5px] text-gray-400">Drop the .csv here, or click to choose</p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-[12px] flex-1"
                  disabled={!file || importer.isPending}
                  onClick={() => send(true)}
                >
                  <ShieldCheck size={14} className="mr-1.5" /> Validate only
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl text-[12px] flex-1"
                  disabled={!file || importer.isPending}
                  onClick={() => send(false)}
                >
                  {importer.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {result && <ImportResult result={result} dryRun={wasDryRun} file={file} report={report} />}
    </div>
  );
}

function ImportResult({
  result,
  dryRun,
  file,
  report,
}: {
  result: PromotionImportResultDto;
  dryRun: boolean;
  file: File | null;
  report: ReturnType<typeof useDownloadPromotionErrorReport>;
}) {
  const failed = result.failedRows > 0;

  // Three outcomes, not two: a clean dry run is neither a success nor a failure, and
  // showing it in green as "imported" is exactly the confusion Validate exists to avoid.
  const tone = failed ? 'bad' : dryRun ? 'neutral' : 'good';

  return (
    <Card className="border-gray-100 card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
      <div
        className={`flex items-start gap-2.5 px-5 py-4 border-b ${
          tone === 'bad'
            ? 'bg-red-50/50 border-red-100'
            : tone === 'good'
              ? 'bg-green-50/60 border-green-100'
              : 'bg-blue-50/50 border-blue-100'
        }`}
      >
        {tone === 'bad' ? (
          <AlertTriangle size={17} className="text-red-500 mt-0.5 flex-shrink-0" />
        ) : tone === 'good' ? (
          <CheckCircle2 size={17} className="text-green-600 mt-0.5 flex-shrink-0" />
        ) : (
          <ShieldCheck size={17} className="text-blue-600 mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-[13px] text-gray-900" style={{ fontWeight: 700 }}>
            {tone === 'bad'
              ? 'Nothing was imported'
              : tone === 'good'
                ? `Imported — ${result.created} created, ${result.updated} updated`
                : 'The workbook is valid. Nothing has been saved.'}
          </p>
          <p className="text-[11.5px] text-gray-600 mt-0.5">
            {tone === 'bad'
              ? `${result.failedRows} problem(s) across ${result.totalRows} promotion row(s). The whole file is rejected together, so nothing was written — fix these and upload again.`
              : tone === 'good'
                ? 'All saved as drafts. Open each one to submit it for approval and activate it — nothing here is live yet.'
                : `${result.created} would be created and ${result.updated} updated. Press Import to save them as drafts.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-100">
        {[
          { label: 'Promotion rows', value: result.totalRows, tone: 'text-gray-900' },
          {
            // Labelled by outcome: "passed validation" is not "saved" unless it imported.
            label: result.imported ? 'Created' : 'Would create',
            value: result.created,
            tone: result.imported ? 'text-green-600' : 'text-gray-400',
          },
          {
            label: result.imported ? 'Updated' : 'Would update',
            value: result.updated,
            tone: result.imported ? 'text-green-600' : 'text-gray-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="px-5 py-3">
            <p className="text-[11px] text-gray-400">{stat.label}</p>
            <p className={`text-[20px] tabular-nums ${stat.tone}`} style={{ fontWeight: 700 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {result.errors.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
            <h3 className="text-[12.5px] text-gray-900" style={{ fontWeight: 600 }}>
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
                  {['Sheet', 'Row', 'Promotion', 'Column', 'Problem'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[11px] text-gray-400" style={{ fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.errors.map((error, index) => (
                  // Sheet and row together are not unique — one row can fail several
                  // columns — so the index is part of the key rather than a fallback.
                  <tr key={`${error.sheet}-${error.row}-${index}`} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-[12px] text-gray-500">{error.sheet}</td>
                    {/* The worksheet row number, so it can be typed straight into Excel's
                        go-to box rather than counted down the list. */}
                    <td className="px-5 py-2.5 text-[12px] font-mono text-gray-500">{error.row}</td>
                    <td className="px-5 py-2.5 text-[12px] text-gray-700">
                      {error.code || <span className="text-gray-300">blank</span>}
                    </td>
                    <td className="px-5 py-2.5 text-[12px] text-gray-700">
                      {error.field}
                      {error.value && <span className="block text-[10.5px] text-gray-400">{error.value}</span>}
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
    </Card>
  );
}
