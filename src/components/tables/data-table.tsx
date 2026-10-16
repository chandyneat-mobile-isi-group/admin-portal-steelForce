'use client';

import { EmptyState } from '@/components/layout/section-header';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Inbox,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Return a node; the table supplies padding and alignment. */
  cell: (row: T) => React.ReactNode;
  /** Sort accessor. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  /** Tailwind width class, e.g. `w-[180px]`. */
  width?: string;
  /** Hidden below `lg` so dense tables stay readable on tablets. */
  secondary?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon: LucideIcon;
  onSelect: (row: T) => void;
  tone?: 'default' | 'danger';
  /** Hide the action for rows it doesn't apply to. */
  visible?: (row: T) => boolean;
  /** Renders a separator above this item. */
  divider?: boolean;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

/**
 * Operational data table.
 *
 * Owns sorting, selection, pagination, the row action menu and the empty and
 * loading states, so a page supplies columns and rows and nothing else. Row
 * actions live in a single overflow menu rather than as inline buttons —
 * eleven columns plus seven buttons is unreadable at any width.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  actions,
  onRowClick,
  selectable = false,
  selected = [],
  onSelectedChange,
  pageSize = 12,
  loading = false,
  emptyTitle = 'Nothing to show',
  emptyHint,
  emptyAction,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  actions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
  caption?: string;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);

  // Any change to the underlying set can shrink the page count out from under
  // the current page; snap back rather than render an empty page.
  useEffect(() => setPage(1), [rows.length]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const allOnPageSelected =
    visible.length > 0 && visible.every((r) => selected.includes(r.id));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    const ids = visible.map((r) => r.id);
    onSelectedChange(
      allOnPageSelected
        ? selected.filter((id) => !ids.includes(id))
        : Array.from(new Set([...selected, ...ids]))
    );
  };

  const toggleRow = (id: string) => {
    if (!onSelectedChange) return;
    onSelectedChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  const cycleSort = (key: string) =>
    setSort((prev) =>
      !prev || prev.key !== key
        ? { key, dir: 'asc' }
        : prev.dir === 'asc'
          ? { key, dir: 'desc' }
          : null
    );

  if (loading) return <TableSkeleton columns={columns.length + (selectable ? 1 : 0)} />;

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-surface bg-card p-2">
        <EmptyState icon={Inbox} title={emptyTitle} hint={emptyHint} />
        {emptyAction && <div className="flex justify-center pb-6">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-surface bg-muted/30">
              {selectable && (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    label="Select all rows on this page"
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${col.width ?? ''} ${col.secondary ? 'hidden lg:table-cell' : ''} px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.sortValue ? (
                      <button
                        onClick={() => cycleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-main transition-colors ${
                          active ? 'text-primary' : ''
                        } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === 'asc' ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : (
                          <ArrowUpDown size={11} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {actions && actions.length > 0 && (
                <th scope="col" className="w-12 px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {visible.map((row, i) => {
              const isSelected = selected.includes(row.id);
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 10) * 0.015, duration: 0.2 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-surface last:border-0 transition-colors ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-accent/30'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        label={`Select row ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${col.secondary ? 'hidden lg:table-cell' : ''} px-3 py-2.5 text-[12px] text-main align-middle ${
                        col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu row={row} actions={actions} />
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={current}
        pageCount={pageCount}
        total={sorted.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`w-[16px] h-[16px] rounded-[5px] border flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        checked ? 'gradient-primary border-transparent' : 'border-surface hover:border-primary/40'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" aria-hidden>
          <path
            d="M2 6.2 4.6 8.8 10 3.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function RowActionMenu<T extends { id: string }>({
  row,
  actions,
}: {
  row: T;
  actions: RowAction<T>[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = actions.filter((a) => !a.visible || a.visible(row));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE }}
            role="menu"
            className="absolute right-0 top-8 z-40 w-52 rounded-card glass card-shadow p-1.5 origin-top-right"
          >
            {items.map((action) => (
              <div key={action.label}>
                {action.divider && <div className="my-1 h-px bg-border" />}
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    action.onSelect(row);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors text-left ${
                    action.tone === 'danger'
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                      : 'text-main hover:bg-accent/60'
                  }`}
                >
                  <action.icon size={14} className="flex-shrink-0" />
                  {action.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-t border-surface bg-muted/20">
      <p className="text-[11.5px] text-muted-foreground tabular-nums">
        Showing <span className="font-semibold text-main">{first}–{last}</span> of{' '}
        <span className="font-semibold text-main">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <PageButton onClick={() => onChange(page - 1)} disabled={page === 1} label="Previous page">
            <ChevronLeft size={14} />
          </PageButton>
          <span className="px-2.5 text-[11.5px] text-muted-foreground tabular-nums">
            Page <span className="font-semibold text-main">{page}</span> of {pageCount}
          </span>
          <PageButton
            onClick={() => onChange(page + 1)}
            disabled={page === pageCount}
            label="Next page"
          >
            <ChevronRight size={14} />
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/60 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="rounded-card border border-surface bg-card overflow-hidden">
      <div className="h-10 bg-muted/30 border-b border-surface" />
      {Array.from({ length: 8 }, (_, r) => (
        <div key={r} className="flex items-center gap-3 px-3 py-3 border-b border-surface last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className="skeleton h-3 rounded-md"
              style={{ width: c === 0 ? '22%' : `${8 + ((c * 7) % 12)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Appears when rows are selected. Anchored to the bottom of the viewport so it
 * is reachable without scrolling back to the top of a long table.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(680px,calc(100vw-32px))]"
        >
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-surface bg-card-surface card-shadow px-3.5 py-2.5">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-main">
              <span className="w-6 h-6 rounded-lg gradient-primary text-white text-[11px] flex items-center justify-center tabular-nums">
                {count}
              </span>
              selected
            </span>
            <div className="flex flex-wrap items-center gap-2 ml-auto">{children}</div>
            <button
              onClick={onClear}
              aria-label="Clear selection"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
