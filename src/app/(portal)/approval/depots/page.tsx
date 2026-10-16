'use client';

/**
 * Depot approval queue.
 *
 * Every row answers two questions at a glance: **who gives the final approval** (the
 * credit policy's matrix, from the depot's credit limit and term) and **where the
 * registration is now** (submitted → final approval → SAP → active). The strip at the
 * top counts what is waiting on each level, so an approver sees their own pile first.
 *
 * The rows are the registrations in the depot master, so a decision taken here — or on
 * the depot directory — moves the same record on both screens.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Eye, Grid3X3, Layers, Loader2, MapPin, Route, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageBody } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import {
  APPROVAL_LEVELS,
  ApprovalJourney,
  ApprovalMatrix,
  JourneyNow,
  LevelBadge,
  NOT_DEFINED_TONE,
  depotJourney,
  requiredApproval,
  useDepotRegistrations,
  type ApprovalLevel,
  type Journey,
  type RequiredLevel,
} from '@/features/approvals';

interface QueueRow {
  id: string;
  code: string;
  name: string;
  type: string;
  province: string;
  rep: string;
  submittedAt: Date | null;
  status: string;
  creditLimit: number | null;
  creditTermDays: number | null;
  required: RequiredLevel;
  journey: Journey;
}

function toRow(base: Omit<QueueRow, 'required' | 'journey'>): QueueRow {
  const required = requiredApproval(base.creditLimit, base.creditTermDays);
  return { ...base, required, journey: depotJourney(base.status, required) };
}

// ── Registrations ─────────────────────────────────────────────────────────────

function useQueueRows(): { rows: QueueRow[]; loading: boolean; error: boolean } {
  const registrations = useDepotRegistrations();

  // Not memoised: a few dozen rows, recomputed only when the query hands back new data.
  const rows = (registrations.data ?? []).map((r) =>
    toRow({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      province: r.province,
      rep: r.rep,
      submittedAt: r.submittedAt ? new Date(r.submittedAt) : null,
      status: r.status,
      creditLimit: r.creditLimit,
      creditTermDays: r.creditTermDays,
    })
  );

  return { rows, loading: registrations.isLoading, error: registrations.isError };
}

// ── Page ──────────────────────────────────────────────────────────────────────

const WAITING = new Set(['PendingApproval', 'RegionManagerApproved', 'SalesManagerApproved']);

const STAGES = [
  { value: 'approval', label: 'Waiting for approval' },
  { value: 'sap', label: 'Registering in SAP' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Not submitted' },
];

function stageOf(row: QueueRow): string {
  const current = row.journey.steps.find((s) => s.state === 'current' || s.state === 'rejected');
  if (row.status === 'Draft') return 'draft';
  if (row.status === 'Rejected') return 'rejected';
  if (!current) return 'active';
  return current.key === 'sap' ? 'sap' : 'approval';
}

/** Which level a row is waiting on, for the strip and the level filter. */
function levelKey(row: QueueRow): string {
  return row.required.kind === 'level' ? `L${row.required.level}` : 'none';
}

const TYPE_OPTIONS = [
  { value: 'Depot (BP)', label: 'Depot (BP)' },
  { value: 'Non-BP Depot', label: 'Non-BP Depot' },
];

export default function DepotsApprovalPage() {
  const { rows, loading, error } = useQueueRows();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('approval');
  const [level, setLevel] = useState('All');
  const [type, setType] = useState('All');
  const [showMatrix, setShowMatrix] = useState(false);

  // What is waiting on each approver right now — the "whose desk is it on" strip.
  const waitingByLevel = useMemo(() => {
    const counts: Record<string, number> = { L1: 0, L2: 0, L3: 0, L4: 0, none: 0 };
    rows.filter((r) => stageOf(r) === 'approval').forEach((r) => (counts[levelKey(r)] += 1));
    return counts;
  }, [rows]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => (counts[stageOf(r)] = (counts[stageOf(r)] ?? 0) + 1));
    return counts;
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => stage === 'All' || stageOf(r) === stage)
      .filter((r) => level === 'All' || levelKey(r) === level)
      .filter((r) => type === 'All' || r.type === type)
      .filter((r) => !q || `${r.name} ${r.code} ${r.id} ${r.rep} ${r.province}`.toLowerCase().includes(q))
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
  }, [rows, search, stage, level, type]);

  const pickLevel = (key: string) => {
    setStage('approval');
    setLevel((current) => (current === key ? 'All' : key));
  };

  return (
    <PageBody>
      <PageHeader
        title="Depots Approval"
        subtitle="Who approves each new depot, and where every registration is right now."
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowMatrix((v) => !v)}>
            <Grid3X3 size={14} className="mr-1.5" /> Approval matrix
            {showMatrix ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
          </Button>
        }
      />

      {showMatrix && (
        <Card className="p-5 rounded-card border-surface card-shadow">
          <p className="text-[13px] font-semibold text-main">Which level gives the final approval</p>
          <p className="mb-3 text-[11.5px] text-muted-foreground">
            Lowest level allowed to approve a credit limit and term. &lsquo;Up to&rsquo; includes the amount, &lsquo;over&rsquo; excludes it. A term between columns is read against the next column up.
          </p>
          <ApprovalMatrix />
        </Card>
      )}

      {/* Waiting on each approver */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([1, 2, 3, 4] as ApprovalLevel[]).map((lvl) => {
          const info = APPROVAL_LEVELS[lvl];
          const key = info.code;
          const active = level === key && stage === 'approval';
          return (
            <button
              key={key}
              type="button"
              onClick={() => pickLevel(key)}
              className={`rounded-card border bg-card p-4 text-left card-shadow transition-colors ${
                active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-surface hover:bg-accent/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${info.tone}`}>{info.code}</span>
                <span className="text-[22px] font-bold text-main tabular-nums">{waitingByLevel[key]}</span>
              </div>
              <p className="mt-2 text-[12.5px] font-semibold text-main">{info.role}</p>
              <p className="truncate text-[11px] text-muted-foreground">{info.title}</p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => pickLevel('none')}
          className={`col-span-2 md:col-span-1 rounded-card border bg-card p-4 text-left card-shadow transition-colors ${
            level === 'none' && stage === 'approval' ? 'border-primary/50 ring-2 ring-primary/15' : 'border-surface hover:bg-accent/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${NOT_DEFINED_TONE}`}>—</span>
            <span className="text-[22px] font-bold text-main tabular-nums">{waitingByLevel.none}</span>
          </div>
          <p className="mt-2 text-[12.5px] font-semibold text-main">Needs a decision</p>
          <p className="truncate text-[11px] text-muted-foreground">No approver in policy, or credit not set</p>
        </button>
      </div>

      <Card className="rounded-card border-surface card-shadow overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface p-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search depot, code, rep or province…" className="w-full sm:w-[280px]" />
          <FilterChip
            label="Stage"
            icon={Route}
            value={stage}
            options={STAGES.map((s) => ({ value: s.value, label: `${s.label} (${stageCounts[s.value] ?? 0})` }))}
            onChange={setStage}
            allLabel="All stages"
          />
          <FilterChip
            label="Approver"
            icon={Layers}
            value={level}
            options={[
              ...([1, 2, 3, 4] as ApprovalLevel[]).map((l) => ({ value: `L${l}`, label: `L${l} · ${APPROVAL_LEVELS[l].role}` })),
              { value: 'none', label: 'Not defined / not set' },
            ]}
            onChange={setLevel}
            allLabel="Any approver"
          />
          <FilterChip label="Type" icon={Store} value={type} options={TYPE_OPTIONS} onChange={setType} allLabel="All types" />
          <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
            {shown.length} of {rows.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : error ? (
          <p className="py-14 text-center text-[13px] text-red-500">The approval queue could not be loaded.</p>
        ) : shown.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[13px] font-semibold text-main">Nothing here</p>
            <p className="mt-1 text-[12px] text-muted-foreground">No registrations match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-[12.5px]">
              <thead>
                <tr className="border-b border-surface bg-muted/20 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Depot</th>
                  <th className="px-4 py-3 text-left font-semibold">Credit</th>
                  <th className="px-4 py-3 text-left font-semibold">Final approver</th>
                  <th className="px-4 py-3 text-left font-semibold">Where it is now</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-surface last:border-0 hover:bg-accent/20">
                    <td className="px-4 py-3">
                      <Link href={`/approval/depots/${r.id}`} className="font-semibold text-main hover:text-primary">
                        {r.name}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>{r.code || r.id}</span>
                        <span
                          className={`rounded px-1.5 text-[10px] font-semibold ${
                            r.type.includes('Non') ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {r.type || 'Depot'}
                        </span>
                        {r.province && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin size={10} /> {r.province}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-main tabular-nums">
                        {r.creditLimit != null ? `$${r.creditLimit.toLocaleString()}` : '—'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {r.creditTermDays != null ? `${r.creditTermDays} days` : 'No term'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge required={r.required} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ApprovalJourney journey={r.journey} compact />
                        <JourneyNow journey={r.journey} />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11.5px] text-muted-foreground">
                      {r.submittedAt ? format(r.submittedAt, 'd MMM, HH:mm') : '—'}
                      {r.rep && <span className="block">{r.rep}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/approval/depots/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-2.5 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10"
                      >
                        <Eye size={14} /> {WAITING.has(r.status) ? 'Review' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageBody>
  );
}
