'use client';

/**
 * SAP's sales employee register, paged through `salesEmployeesApi`.
 *
 * ## Paged on the server, deliberately
 *
 * The register is ~5,800 rows and grows with headcount. The shared `DataTable` pages in the browser over an
 * array it is handed whole, which would mean downloading the entire personnel master to
 * show fifty names. So this component drives `pageNumber`/`pageSize` on the query and
 * renders its own controls.
 *
 * ## A note on the row count
 *
 * This register briefly held every person twice — once under a six-digit personnel
 * number and once zero-padded to ten — because SAP changed the format and the sync
 * matched on the literal code, so the new form was inserted as a new person and the old
 * form was deactivated as a leaver. The 5,809 duplicates have been removed and the sync
 * now matches personnel numbers with leading zeros stripped, so it cannot recur.
 *
 * Kept as a comment because the shape of the fix is not obvious from the code: the
 * normalisation is applied to sales employees only, since in every other catalogue a
 * leading zero is significant.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { ChevronLeft, ChevronRight, Info, Loader2, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSalesEmployees } from '@/features/sales-reps';

const PAGE_SIZES = [25, 50, 100];

/**
 * Kept although the register is currently all-current: SAP genuinely does retire
 * personnel numbers, and when it does those rows stay here so a customer signed years
 * ago still resolves to the person who signed it.
 */
const STATUS_OPTIONS = [
  { value: 'current', label: 'Current staff' },
  { value: 'former', label: 'Former staff' },
];

export function SalesEmployeeRegister() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Any change to the filters can shrink the page count out from under the current
  // page; snap back rather than render an empty table at page 400 of 12.
  useEffect(() => setPageNumber(1), [search, status, pageSize]);

  const query = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: search.trim() || undefined,
      isActive: status === 'All' ? undefined : status === 'current',
    }),
    [pageNumber, pageSize, search, status]
  );

  const { data, isLoading, isFetching, error } = useSalesEmployees(query);

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const lastRow = Math.min(pageNumber * pageSize, total);

  return (
    <div className="space-y-5">
      {/* The caveat, stated where the number is read. */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
        <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-gray-600 leading-relaxed">
          <span className="font-600" style={{ fontWeight: 600 }}>
            These are SAP personnel records, not portal users.
          </span>{' '}
          Nobody here can sign in to the portal or be given a route until they have an
          account on the Field reps tab — which is why that tab shows far fewer people.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search personnel number or name…"
          className="w-full sm:w-80"
        />
        <FilterChip
          label="Records"
          value={status}
          options={STATUS_OPTIONS}
          icon={UserCheck}
          onChange={setStatus}
          allLabel="All records"
        />
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-gray-400">Rows</span>
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setPageSize(size)}
              className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                pageSize === size ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-gray-100 card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
        {/* isFetching rather than isLoading: the query keeps the previous page on
            screen while the next loads, so the only honest signal that the table is
            one step behind is a quiet overlay, not a blank panel. */}
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-100 overflow-hidden">
              <div className="h-full w-1/3 gradient-primary animate-pulse" />
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-600 text-gray-400" style={{ fontWeight: 600 }}>
                  Personnel no.
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-600 text-gray-400" style={{ fontWeight: 600 }}>
                  Name
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-600 text-gray-400" style={{ fontWeight: 600 }}>
                  Status
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-600 text-gray-400 hidden lg:table-cell" style={{ fontWeight: 600 }}>
                  Last synced
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    <span className="text-[12px]">Loading register…</span>
                  </td>
                </tr>
              )}

              {error && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-[13px] text-red-500">
                    Failed to load the register. Please try again.
                  </td>
                </tr>
              )}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-[13px] text-gray-400">
                    No employees match these filters.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                rows.map((row) => (
                  <tr
                    key={row.personnelNumber}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3 text-[12px] font-mono text-gray-600">{row.personnelNumber}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-900">
                      {/* SAP sends blank names for a few personnel numbers. Shown as a
                          gap rather than filled with the number again, so an incomplete
                          record does not read as a complete one. */}
                      {row.fullName || <span className="text-gray-300">No name on record</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600 border ${
                          row.isActive
                            ? 'bg-green-50 text-green-600 border-green-100'
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}
                        style={{ fontWeight: 600 }}
                      >
                        {row.isActive ? 'Current' : 'Former'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-400 hidden lg:table-cell">
                      {row.synchronisedAt ? format(new Date(row.synchronisedAt), 'd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paging */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <span className="text-[11.5px] text-gray-500">
            {total === 0
              ? 'No records'
              : `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${total.toLocaleString()}`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[12px]"
              disabled={pageNumber <= 1 || isLoading}
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={14} className="mr-1" /> Previous
            </Button>

            <span className="text-[11.5px] text-gray-500 tabular-nums">
              Page {pageNumber.toLocaleString()} of {totalPages.toLocaleString()}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[12px]"
              disabled={pageNumber >= totalPages || isLoading}
              onClick={() => setPageNumber((page) => Math.min(totalPages, page + 1))}
            >
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
