'use client';

/**
 * Links from this promotion to others: requires, depends on, excludes, combines with.
 *
 * The whole list is sent on every save and replaces what was there. The client checks
 * what it can (duplicates, a link that both requires and excludes the same promotion);
 * a circle of requirements across several promotions is only knowable on the server,
 * which answers `Promotion.RelationshipCircular`, shown here as a banner.
 */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Link2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { RELATIONSHIP_INFO, RELATIONSHIP_TYPES, type RelationshipType } from '../api';
import { usePromotions } from '../hooks';
import { StatusChip } from '../presentation';
import { relationshipMeta } from './rule-view';

export interface RelationshipRow {
  id: string;
  relatedPromotionId: string;
  code: string;
  name: string;
  type: RelationshipType;
}

let seq = 0;

/** Client-side checks. Returns a message per row id. */
export function validateRelationships(rows: RelationshipRow[]): Record<string, string> {
  const issues: Record<string, string> = {};
  const seen = new Set<string>();
  rows.forEach((r) => {
    if (!r.relatedPromotionId) {
      issues[r.id] = 'Choose a promotion.';
      return;
    }
    const key = `${r.relatedPromotionId}|${r.type}`;
    if (seen.has(key)) issues[r.id] = 'This link is listed twice.';
    seen.add(key);
  });
  const byTarget = new Map<string, RelationshipRow[]>();
  rows.forEach((r) => r.relatedPromotionId && byTarget.set(r.relatedPromotionId, [...(byTarget.get(r.relatedPromotionId) ?? []), r]));
  byTarget.forEach((list) => {
    const types = new Set(list.map((r) => r.type));
    if (types.has('Excludes') && (types.has('Requires') || types.has('DependsOn'))) {
      list.forEach((r) => (issues[r.id] ??= 'Cannot require and exclude the same promotion.'));
    }
  });
  return issues;
}

export function RelationshipsEditor({
  rows,
  onChange,
  excludeId,
  showIssues,
  serverError,
}: {
  rows: RelationshipRow[];
  onChange: (rows: RelationshipRow[]) => void;
  /** The promotion being edited, which cannot link to itself. */
  excludeId?: string;
  showIssues: boolean;
  serverError?: string;
}) {
  const issues = validateRelationships(rows);
  const set = (id: string, patch: Partial<RelationshipRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {serverError && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-700 dark:text-rose-300">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {serverError}
        </p>
      )}

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-surface px-4 py-3 text-[12px] text-muted-foreground">
          Not linked to other promotions. Add a link when this promotion should only apply with, after, or never with another one.
        </p>
      )}

      {rows.map((row) => {
        const { look } = relationshipMeta(row.type);
        const Icon = look.icon;
        const problem = showIssues ? issues[row.id] : undefined;
        return (
          <div key={row.id} className={`rounded-xl border ${problem ? 'border-rose-400' : 'border-surface'} p-2.5`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start">
              <span className={`hidden md:flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${look.tone}`}>
                <Icon size={15} />
              </span>
              <select
                value={row.type}
                onChange={(e) => set(row.id, { type: e.target.value as RelationshipType })}
                className="h-9 w-full md:w-40 flex-shrink-0 rounded-lg border border-surface bg-transparent px-2 text-[12px] font-semibold"
              >
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RELATIONSHIP_INFO[t].label}
                  </option>
                ))}
              </select>
              <div className="min-w-0 flex-1">
                <PromotionPicker
                  value={row.relatedPromotionId ? { id: row.relatedPromotionId, code: row.code, name: row.name } : null}
                  excludeId={excludeId}
                  onPick={(p) => set(row.id, { relatedPromotionId: p.id, code: p.code, name: p.name })}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                aria-label="Remove link"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center self-end rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 md:self-auto"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">{RELATIONSHIP_INFO[row.type].hint}</p>
            {problem && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <AlertCircle size={12} /> {problem}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          onChange([...rows, { id: `rel-${Date.now().toString(36)}-${seq++}`, relatedPromotionId: '', code: '', name: '', type: 'Requires' }])
        }
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-surface px-2.5 py-1.5 text-[11.5px] font-medium text-primary hover:bg-primary/5"
      >
        <Plus size={12} /> Link a promotion
      </button>
    </div>
  );
}

/** A search over the catalogue: code · name · status. */
function PromotionPicker({
  value,
  excludeId,
  onPick,
}: {
  value: { id: string; code: string; name: string } | null;
  excludeId?: string;
  onPick: (p: { id: string; code: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const { data, isFetching, isError } = usePromotions({ ...(debounced ? { search: debounced } : {}), pageSize: 20 }, open);
  const items = (data?.items ?? []).filter((p) => p.id !== excludeId);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-surface bg-transparent px-3 text-left text-[12px]"
      >
        <Link2 size={13} className="flex-shrink-0 text-muted-foreground" />
        {value ? (
          <span className="min-w-0 truncate">
            <span className="font-mono font-semibold">{value.code}</span>
            {value.name && <span className="text-muted-foreground"> · {value.name}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">Choose a promotion…</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-lg border border-surface bg-card p-1 shadow-xl">
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or name"
              className="h-8 w-full rounded-md border border-surface bg-transparent pl-8 pr-2 text-[12px] outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {isFetching && items.length === 0 ? (
              <p className="flex items-center gap-1.5 px-2 py-2 text-[11.5px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Searching…
              </p>
            ) : isError ? (
              <p className="px-2 py-2 text-[11.5px] text-rose-600">Could not load promotions.</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-2 text-[11.5px] text-muted-foreground">No promotions match.</p>
            ) : (
              items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick({ id: p.id, code: p.code, name: p.name });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-accent/50"
                >
                  <span className="font-mono font-semibold">{p.code}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.name}</span>
                  <StatusChip status={p.status} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
