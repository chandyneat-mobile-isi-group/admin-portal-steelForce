'use client';

/**
 * Product catalogue — the SAP material master held locally.
 *
 * ## Paged on the server
 *
 * The master is large. The shared `DataTable` pages in the browser over an array
 * it is handed whole, so it is not used here: this drives `pageNumber`/`pageSize` on the
 * query and renders its own controls, the same as the SAP employee register.
 *
 * ## Read from the copy, not from SAP
 *
 * Everything on this screen comes from the platform's own tables, filled by the syncs in
 * the panel below. That is what makes it fast and what makes it work when SAP is
 * unreachable — and it is also why `synchronisedAt` matters: the screen is as current as
 * the last sync, not as current as SAP.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { useMaterialReferences, useMaterials } from '@/features/materials';
import { SapSyncPanel } from './sap-sync-panel';

const PAGE_SIZES = [25, 50, 100];

export default function ProductCatalogPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [group, setGroup] = useState('All');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Any filter change can shrink the page count out from under the current page.
  useEffect(() => setPageNumber(1), [search, type, group, pageSize]);

  const types = useMaterialReferences('types');
  const groups = useMaterialReferences('groups');

  const query = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: search.trim() || undefined,
      materialType: type === 'All' ? undefined : type,
      materialGroup: group === 'All' ? undefined : group,
    }),
    [pageNumber, pageSize, search, type, group]
  );

  const { data, isLoading, isFetching, error } = useMaterials(query);

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const lastRow = Math.min(pageNumber * pageSize, total);

  const typeOptions = useMemo(
    () => (types.data ?? []).map((t) => ({ value: t.code, label: t.name ? `${t.code} — ${t.name}` : t.code })),
    [types.data]
  );

  // 239 groups is too many for a chip list to be usable, so it is searchable.
  const groupOptions = useMemo(
    () => (groups.data ?? []).map((g) => ({ value: g.code, label: g.name ? `${g.code} — ${g.name}` : g.code })),
    [groups.data]
  );

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Materials</h1>
        <p className="text-sm text-gray-500 mt-1">
          The SAP material master, copied into the platform. {total.toLocaleString()} materials.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search material number or description…"
          className="w-full sm:w-80"
        />
        <FilterChip label="Type" value={type} options={typeOptions} icon={Package} onChange={setType} />
        <FilterChip
          label="Group"
          value={group}
          options={groupOptions}
          icon={Package}
          onChange={setGroup}
          searchable
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
        <div className="relative overflow-x-auto">
          {isFetching && !isLoading && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-100 overflow-hidden">
              <div className="h-full w-1/3 gradient-primary animate-pulse" />
            </div>
          )}

          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Material', 'Description', 'Type', 'Group', 'Unit', 'Brand'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-600 text-gray-400"
                    style={{ fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    <span className="text-[12px]">Loading catalogue…</span>
                  </td>
                </tr>
              )}

              {error && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-[13px] text-red-500">
                    Failed to load the catalogue. Please try again.
                  </td>
                </tr>
              )}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-[13px] text-gray-400">
                    No materials match these filters.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                rows.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-[12px] font-mono text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {m.material}
                        {/* A blocked material still exists and still shows, but selling it
                            is refused — so the row is marked rather than hidden. */}
                        {m.isBlocked && (
                          <span title="Blocked in SAP — cannot be sold">
                            <Ban size={11} className="text-red-500" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-900">
                      {m.materialName || m.name || <span className="text-gray-300">No description</span>}
                      {m.materialKhName && (
                        <span className="block text-[11px] text-gray-400">{m.materialKhName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-500 whitespace-nowrap">
                      {m.materialTypeName || m.materialType || '—'}
                    </td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-500 whitespace-nowrap">
                      {m.materialGroupName || m.materialGroup || '—'}
                    </td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-500">{m.baseUnit || '—'}</td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-500">{m.brand || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <span className="text-[11.5px] text-gray-500">
            {total === 0
              ? 'No materials'
              : `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[12px]"
              disabled={pageNumber <= 1 || isLoading}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
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
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      <SapSyncPanel />
    </div>
  );
}
