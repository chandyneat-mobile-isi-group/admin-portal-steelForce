'use client';

/**
 * Read-only pieces of the promotion detail page: the approval path, the validity window,
 * the reward tiers and the version timeline. The rule tree lives in `../rule/rule-view`.
 *
 * Kept out of the route file — a Next.js page may only export the page itself.
 */

import { differenceInCalendarDays, format } from 'date-fns';
import { Check, Clock, X, Zap } from 'lucide-react';
import type { PromotionVersionDto } from '../api';
import { StatusChip, rewardLabel } from '../presentation';

export function when(value?: string | null, pattern = 'd MMM yyyy'): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, pattern);
}

const spaced = (value?: string | null) => (value ? value.replace(/([a-z])([A-Z])/g, '$1 $2') : '—');

// ── Approval path ─────────────────────────────────────────────────────────────

type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

interface PathStep {
  key: string;
  label: string;
  owner: string;
  state: StepState;
  note?: string;
}

/** Statuses that end a version's path without it going live. */
const STOPPED = ['Rejected', 'Cancelled', 'Deactivated', 'Superseded', 'Expired'];

function signature(version: PromotionVersionDto, stage: 'commercial' | 'finance') {
  return version.approvals.find((a) => (a.stage ?? '').toLowerCase().includes(stage));
}

/**
 * Draft → Commercial → Finance → Activation → Live, with the stop marked.
 *
 * Where a version stopped is read from its signatures: a rejection records the stage
 * that refused, so the cross lands on that step rather than on the end of the line.
 */
export function approvalPath(version: PromotionVersionDto): PathStep[] {
  const commercial = signature(version, 'commercial');
  const finance = signature(version, 'finance');
  const signedNote = (s?: { outcome?: string | null; decidedAt?: string | null; decidedBy?: string | null }) =>
    s ? `${s.outcome ?? 'Signed'} · ${when(s.decidedAt, 'd MMM')}${s.decidedBy ? ` · ${s.decidedBy}` : ''}` : undefined;

  const order = ['Draft', 'UnderCommercialReview', 'UnderFinanceReview', 'Approved', 'Active'];
  let at = order.indexOf(version.status);
  let stoppedAt = -1;

  if (at === -1) {
    // Off the main line: place the stop after the last stage that was signed.
    const rejected = version.approvals.find((a) => a.outcome === 'Rejected');
    if (rejected) stoppedAt = (rejected.stage ?? '').toLowerCase().includes('finance') ? 2 : 1;
    else if (version.status === 'Deactivated' || version.status === 'Expired' || version.status === 'Superseded')
      stoppedAt = finance?.outcome === 'Approved' ? 4 : commercial ? 2 : 0;
    else stoppedAt = finance?.outcome === 'Approved' ? 3 : commercial?.outcome === 'Approved' ? 2 : commercial ? 1 : 0;
    at = stoppedAt;
  }

  const state = (i: number): StepState => {
    if (stoppedAt >= 0) return i < stoppedAt ? 'done' : i === stoppedAt ? 'stopped' : 'upcoming';
    if (version.status === 'Active') return 'done';
    return i < at ? 'done' : i === at ? 'current' : 'upcoming';
  };

  return [
    { key: 'draft', label: 'Draft', owner: 'Author', state: state(0) },
    { key: 'commercial', label: 'Commercial review', owner: 'Commercial', state: state(1), note: signedNote(commercial) },
    { key: 'finance', label: 'Finance review', owner: 'Finance', state: state(2), note: signedNote(finance) },
    { key: 'activate', label: 'Activation', owner: 'Approved, not live', state: state(3) },
    { key: 'live', label: 'Live', owner: 'Prices on quotations', state: state(4) },
  ];
}

const STEP_LOOK: Record<StepState, { dot: string; text: string }> = {
  done: { dot: 'bg-emerald-500 border-emerald-500 text-white', text: 'text-main' },
  current: { dot: 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-4 ring-amber-500/15', text: 'text-main' },
  upcoming: { dot: 'bg-card border-surface text-muted-foreground', text: 'text-muted-foreground' },
  stopped: { dot: 'bg-rose-500 border-rose-500 text-white', text: 'text-rose-700 dark:text-rose-300' },
};

export function ApprovalPath({ version }: { version: PromotionVersionDto }) {
  const steps = approvalPath(version);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {steps.map((step, i) => {
        const look = STEP_LOOK[step.state];
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center min-w-0">
            {!last && (
              <span
                className={`absolute top-3.5 left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5 rounded-full ${
                  step.state === 'done' ? 'bg-emerald-500/70' : 'bg-border'
                }`}
              />
            )}
            <span className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 ${look.dot}`}>
              {step.state === 'done' ? (
                <Check size={13} strokeWidth={3} />
              ) : step.state === 'stopped' ? (
                <X size={13} strokeWidth={3} />
              ) : step.state === 'current' ? (
                <Clock size={13} strokeWidth={2.5} />
              ) : (
                <span className="text-[10.5px] font-bold">{i + 1}</span>
              )}
            </span>
            <span className={`mt-2 text-[11.5px] font-semibold leading-tight ${look.text}`}>{step.label}</span>
            <span className="text-[10.5px] text-muted-foreground leading-tight">{step.owner}</span>
            {step.note && (
              <span
                className={`mt-1 text-[10px] font-medium leading-tight break-words ${
                  step.note.startsWith('Rejected') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {step.note}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One sentence: what happens next, and on whom. */
export function nextStepLine(status?: string | null): { text: string; tone: string } {
  switch (status) {
    case 'Draft':
      return { text: 'Not submitted. The author submits it for commercial review.', tone: 'text-muted-foreground' };
    case 'UnderCommercialReview':
      return { text: 'Waiting for a commercial signature.', tone: 'text-amber-700 dark:text-amber-300' };
    case 'UnderFinanceReview':
      return { text: 'Commercial signed. Waiting for a finance signature.', tone: 'text-amber-700 dark:text-amber-300' };
    case 'Approved':
      return { text: 'Both signatures in. Not live until someone activates it.', tone: 'text-sky-700 dark:text-sky-300' };
    case 'Active':
      return { text: 'Live — this discount prices on quotations.', tone: 'text-emerald-700 dark:text-emerald-300' };
    default:
      return status && STOPPED.includes(status)
        ? { text: `${spaced(status)} — this version will not price anything.`, tone: 'text-rose-700 dark:text-rose-300' }
        : { text: spaced(status), tone: 'text-muted-foreground' };
  }
}

// ── Validity ──────────────────────────────────────────────────────────────────

/** The window as a bar with today marked, plus "12 days left" / "starts in 3 days". */
export function ValidityWindow({ from, to }: { from?: string | null; to?: string | null }) {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  const today = new Date();
  const valid = (d: Date | null) => d && !Number.isNaN(d.getTime());

  let label = 'No end date';
  let tone = 'text-muted-foreground';
  let pct: number | null = null;

  if (valid(start) && today < start!) {
    const days = differenceInCalendarDays(start!, today);
    label = `Starts in ${days} day${days === 1 ? '' : 's'}`;
    tone = 'text-sky-700 dark:text-sky-300';
    pct = 0;
  } else if (valid(end) && today > end!) {
    label = 'Ended';
    tone = 'text-rose-700 dark:text-rose-300';
    pct = 100;
  } else if (valid(end)) {
    const days = differenceInCalendarDays(end!, today);
    label = days === 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'} left`;
    tone = days <= 7 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300';
    if (valid(start)) {
      const total = Math.max(1, end!.getTime() - start!.getTime());
      pct = Math.min(100, Math.max(0, ((today.getTime() - start!.getTime()) / total) * 100));
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-main tabular-nums">
          {when(from)} <span className="text-muted-foreground font-normal">→</span> {to ? when(to) : 'open-ended'}
        </span>
        <span className={`text-[11.5px] font-semibold whitespace-nowrap ${tone}`}>{label}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        {pct != null && <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

// ── The rule ──────────────────────────────────────────────────────────────────

/** Tiers as a ladder: each step's range, and its reward as a bar against the top tier. */
export function TierLadder({ version }: { version: PromotionVersionDto }) {
  const { tiers } = version;
  const top = Math.max(1, ...tiers.map((t) => t.rewardValue ?? 0));
  const unit = version.unit ? ` ${version.unit}` : '';
  const reward = (v?: number | null) =>
    v == null ? '—' : version.rewardType === 'Percentage' ? `${v}%` : version.rewardType === 'FixedAmount' ? `${version.currency ?? ''} ${v}`.trim() : String(v);

  return (
    <ul className="space-y-2">
      {tiers.map((tier, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3">
          <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
            {tier.fromQuantity ?? 0} – {tier.toQuantity ?? '∞'}
            {unit}
          </span>
          <span className="h-2 rounded-full bg-muted overflow-hidden">
            <span className="block h-full rounded-full bg-primary/70" style={{ width: `${((tier.rewardValue ?? 0) / top) * 100}%` }} />
          </span>
          <span className="text-[12.5px] font-bold text-main tabular-nums whitespace-nowrap text-right">
            {reward(tier.rewardValue)}
            {tier.freeQuantity ? <span className="ml-1.5 text-[11px] font-semibold text-emerald-600">+{tier.freeQuantity} free</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Versions ──────────────────────────────────────────────────────────────────

/** Newest first; the live and open versions tagged; the one on screen highlighted. */
export function VersionTimeline({
  versions,
  liveNumber,
  openNumber,
  viewing,
  onSelect,
}: {
  versions: PromotionVersionDto[];
  liveNumber?: number | null;
  openNumber?: number | null;
  viewing: number;
  onSelect: (versionNumber: number) => void;
}) {
  return (
    <ol className="relative space-y-1">
      {versions.map((v, i) => {
        const selected = v.versionNumber === viewing;
        const isLive = v.versionNumber === liveNumber;
        const isOpen = v.versionNumber === openNumber;
        return (
          <li key={v.id} className="relative pl-6">
            {i < versions.length - 1 && <span className="absolute left-[7px] top-6 bottom-[-6px] w-px bg-border" />}
            <span
              className={`absolute left-0 top-3 h-[15px] w-[15px] rounded-full border-2 ${
                isLive ? 'border-emerald-500 bg-emerald-500' : selected ? 'border-primary bg-primary' : 'border-surface bg-card'
              }`}
            />
            <button
              type="button"
              onClick={() => onSelect(v.versionNumber)}
              className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                selected ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-accent/40'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-main">v{v.versionNumber}</span>
                {isLive && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Zap size={10} /> Live
                  </span>
                )}
                {isOpen && !isLive && (
                  <span className="rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    Open
                  </span>
                )}
                <span className="ml-auto">
                  <StatusChip status={v.status} />
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                {rewardLabel(v)} · {when(v.validFrom, 'd MMM')} – {v.validTo ? when(v.validTo, 'd MMM yy') : 'open'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
