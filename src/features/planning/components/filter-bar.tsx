'use client';

import { FilterChip, ToggleChip, type ChipOption } from '@/components/forms/filter-chip';
import { SearchBar } from '@/components/forms/search-bar';
import { usePlanning } from '@/features/planning/store';
import { allDistricts, districtsByProvince, salesReps } from '@/features/planning/data/demo-data';
import {
  CUSTOMER_TYPES,
  DIVISIONS,
  PRIORITIES,
  PROVINCES,
  SALES_ORGS,
} from '@/features/planning/types';
import { EASE } from '@/lib/utilities/motion';
import { PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  CalendarDays,
  Flag,
  Layers,
  MapPin,
  Map as MapIcon,
  RotateCcw,
  SlidersHorizontal,
  Store,
  UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const opts = (values: readonly string[]): ChipOption[] =>
  values.map((v) => ({ value: v, label: v }));

/**
 * Floating filter bar. The primary row is always visible; the secondary row
 * expands so the board keeps its vertical space for actual planning work.
 *
 * The surface, sticky offset and control gap all come from `PageToolbar`, so
 * this bar is dimensionally identical to the Sales Reps toolbar.
 */
export function FilterBar({ sticky = true }: { sticky?: boolean }) {
  const { filters, setFilter, resetFilters, activeFilterCount, filtered, unassigned, assigned } =
    usePlanning();
  const [expanded, setExpanded] = useState(false);

  const repOptions = useMemo<ChipOption[]>(
    () =>
      salesReps.map((r) => ({
        value: r.id,
        label: r.name,
        hint: `${r.employeeId} · ${r.team}`,
      })),
    []
  );

  const districtOptions = useMemo<ChipOption[]>(
    () =>
      opts(
        filters.province === 'All' ? allDistricts : districtsByProvince[filters.province] ?? []
      ),
    [filters.province]
  );

  return (
    <PageToolbar sticky={sticky}>
      <ToolbarRow>
        <SearchBar
          value={filters.search}
          onChange={(v) => setFilter('search', v)}
          className="w-full sm:w-[280px] lg:w-[320px]"
        />

        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
          <ToggleChip
            label="All"
            active={filters.assignment === 'All'}
            count={filtered.length}
            onClick={() => setFilter('assignment', 'All')}
          />
          <ToggleChip
            label="Unassigned"
            active={filters.assignment === 'Unassigned'}
            count={filters.assignment === 'All' ? undefined : unassigned.length}
            onClick={() => setFilter('assignment', 'Unassigned')}
          />
          <ToggleChip
            label="Assigned"
            active={filters.assignment === 'Assigned'}
            count={filters.assignment === 'All' ? undefined : assigned.length}
            onClick={() => setFilter('assignment', 'Assigned')}
          />
        </div>

        <FilterChip
          label="Sales Org"
          icon={Building2}
          value={filters.salesOrg}
          options={opts(SALES_ORGS)}
          onChange={(v) => setFilter('salesOrg', v as never)}
          allLabel="All sales orgs"
        />
        <FilterChip
          label="Division"
          icon={Layers}
          value={filters.division}
          options={opts(DIVISIONS)}
          onChange={(v) => setFilter('division', v as never)}
          allLabel="All divisions"
        />
        <FilterChip
          label="Province"
          icon={MapPin}
          value={filters.province}
          options={opts(PROVINCES)}
          onChange={(v) => setFilter('province', v as never)}
          allLabel="All provinces"
        />

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition-all duration-200 active:scale-[0.97] ${
            expanded
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-background/60 border-surface text-muted-foreground hover:text-main'
          }`}
        >
          <SlidersHorizontal size={13} />
          More filters
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-px rounded-md bg-primary text-white text-[10px] font-bold tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <RotateCcw size={13} /> Reset
            </motion.button>
          )}
        </AnimatePresence>
      </ToolbarRow>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <ToolbarRow className="pt-3 mt-3 border-t border-surface">
              <FilterChip
                label="District"
                icon={MapIcon}
                value={filters.district}
                options={districtOptions}
                onChange={(v) => setFilter('district', v)}
                allLabel="All districts"
                searchable
              />
              <FilterChip
                label="Customer Type"
                icon={Store}
                value={filters.customerType}
                options={opts(CUSTOMER_TYPES)}
                onChange={(v) => setFilter('customerType', v as never)}
                allLabel="All types"
              />
              <FilterChip
                label="Priority"
                icon={Flag}
                value={filters.priority}
                options={opts(PRIORITIES)}
                onChange={(v) => setFilter('priority', v as never)}
                allLabel="All priorities"
              />
              <FilterChip
                label="Sales Rep"
                icon={UserCheck}
                value={filters.repId}
                options={repOptions}
                onChange={(v) => setFilter('repId', v)}
                allLabel="All sales reps"
                searchable
              />
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-background/60 border border-surface text-[12px] text-muted-foreground">
                <CalendarDays size={13} />
                <input
                  type="date"
                  value={filters.visitDate}
                  onChange={(e) => setFilter('visitDate', e.target.value)}
                  className="bg-transparent text-main text-[12px] focus:outline-none"
                />
              </label>
            </ToolbarRow>
          </motion.div>
        )}
      </AnimatePresence>
    </PageToolbar>
  );
}
