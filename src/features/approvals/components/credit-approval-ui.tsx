'use client';

import { Check, Clock, X } from 'lucide-react';
import {
  APPROVAL_LEVELS,
  APPROVAL_MATRIX,
  LIMIT_BANDS,
  NOT_DEFINED_TONE,
  TERM_COLUMNS,
  type Journey,
  type JourneyStep,
  type RequiredLevel,
} from '../credit-approval';

/** "L3 · RSM" in the level's colour, or a neutral pill when the policy names nobody. */
export function LevelBadge({ required, size = 'md' }: { required: RequiredLevel; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  if (required.kind === 'level') {
    const info = APPROVAL_LEVELS[required.level];
    return (
      <span title={info.title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold ${pad} ${info.tone}`}>
        {info.code}
        <span className="font-medium opacity-80">{info.role}</span>
      </span>
    );
  }
  const label =
    required.kind === 'missing'
      ? required.missing === 'term' ? 'No term set' : required.missing === 'limit' ? 'No limit set' : 'No credit set'
      : required.kind === 'term-over-policy' ? 'Term over 90 days' : 'Not defined';
  return (
    <span
      title={required.kind === 'missing' ? 'Set a credit limit and term to know who approves' : 'The policy names no approver for this combination (D-09)'}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${pad} ${NOT_DEFINED_TONE}`}
    >
      {label}
    </span>
  );
}

const STEP_LOOK: Record<JourneyStep['state'], { ring: string; icon: React.ReactNode; text: string }> = {
  done: { ring: 'bg-emerald-500 text-white border-emerald-500', icon: <Check size={12} strokeWidth={3} />, text: 'text-main' },
  current: { ring: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500', icon: <Clock size={12} strokeWidth={2.5} />, text: 'text-main' },
  upcoming: { ring: 'bg-card text-muted-foreground border-surface', icon: null, text: 'text-muted-foreground' },
  rejected: { ring: 'bg-rose-500 text-white border-rose-500', icon: <X size={12} strokeWidth={3} />, text: 'text-rose-700 dark:text-rose-300' },
};

/**
 * The four stops of a registration, left to right, with the current one ringed.
 * `compact` drops the owner line and labels, for a table row.
 */
export function ApprovalJourney({ journey, compact = false }: { journey: Journey; compact?: boolean }) {
  const { steps } = journey;
  return (
    <ol className={`flex ${compact ? 'items-center' : 'items-start'}`}>
      {steps.map((s, i) => {
        const look = STEP_LOOK[s.state];
        const last = i === steps.length - 1;
        const lineDone = s.state === 'done';
        return (
          <li key={s.key} className={`flex ${compact ? 'items-center' : 'flex-1 items-start'} ${last ? '' : 'flex-1'}`} title={`${s.label} · ${s.owner}`}>
            <div className={`flex ${compact ? '' : 'flex-col items-center text-center min-w-[72px]'}`}>
              <span
                className={`flex flex-shrink-0 items-center justify-center rounded-full border-2 ${compact ? 'h-5 w-5' : 'h-7 w-7'} ${look.ring} ${
                  s.state === 'current' ? 'ring-4 ring-amber-500/15' : ''
                }`}
              >
                {look.icon ?? <span className={`${compact ? 'text-[9px]' : 'text-[10.5px]'} font-bold`}>{i + 1}</span>}
              </span>
              {!compact && (
                <>
                  <span className={`mt-1.5 text-[11.5px] font-semibold ${look.text}`}>{s.label}</span>
                  <span className="text-[10.5px] text-muted-foreground">{s.owner}</span>
                  {s.note && <span className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{s.note}</span>}
                </>
              )}
            </div>
            {!last && (
              <span
                className={`${compact ? 'mx-1 h-0.5 w-5' : 'mx-1 mt-3.5 h-0.5 flex-1'} rounded-full ${lineDone ? 'bg-emerald-500/70' : 'bg-border'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const NOW_TONE: Record<Journey['now']['tone'], string> = {
  waiting: 'text-amber-700 dark:text-amber-300',
  done: 'text-emerald-700 dark:text-emerald-300',
  rejected: 'text-rose-700 dark:text-rose-300',
  draft: 'text-muted-foreground',
  blocked: 'text-slate-600 dark:text-slate-300',
};

/** "Waiting for approval · L3 · RSM" — where it is, on one line. */
export function JourneyNow({ journey }: { journey: Journey }) {
  return (
    <span className="block min-w-0">
      <span className={`block truncate text-[12px] font-semibold ${NOW_TONE[journey.now.tone]}`}>{journey.now.label}</span>
      <span className="block truncate text-[10.5px] text-muted-foreground">{journey.now.owner}</span>
    </span>
  );
}

/**
 * The policy table (7.2), optionally with one cell ringed — the combination of the
 * depot being reviewed.
 */
export function ApprovalMatrix({ highlight }: { highlight?: RequiredLevel }) {
  const hRow = highlight && 'row' in highlight ? highlight.row : -1;
  const hCol = highlight && 'col' in highlight ? highlight.col : -1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-1.5 text-left font-semibold">Credit limit (USD)</th>
            {TERM_COLUMNS.map((d, c) => (
              <th key={d} className={`px-1 py-1.5 font-semibold ${c === hCol ? 'text-primary' : ''}`}>{d} days</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIMIT_BANDS.map((band, r) => (
            <tr key={band.label}>
              <td className={`whitespace-nowrap px-2 py-1.5 text-left font-semibold ${r === hRow ? 'text-primary' : 'text-main'}`}>{band.label}</td>
              {APPROVAL_MATRIX[r].map((level, c) => {
                const info = level ? APPROVAL_LEVELS[level] : null;
                const active = r === hRow && c === hCol;
                return (
                  <td
                    key={c}
                    className={`rounded-md border px-1 py-1.5 ${info ? info.tone : NOT_DEFINED_TONE} ${
                      active ? 'ring-2 ring-primary ring-offset-1 ring-offset-card font-bold' : hRow >= 0 ? 'opacity-55' : ''
                    }`}
                  >
                    <span className="block font-bold">{info ? info.code : '—'}</span>
                    <span className="block text-[9.5px] opacity-80">{info ? info.role : 'Not defined'}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.values(APPROVAL_LEVELS).map((info) => (
          <span key={info.code} className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${info.tone}`}>
            {info.code} {info.role}
          </span>
        ))}
        <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${NOT_DEFINED_TONE}`}>Not defined — D-09</span>
      </div>
    </div>
  );
}
