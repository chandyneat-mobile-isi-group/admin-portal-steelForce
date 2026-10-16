'use client';

import { CalendarX2 } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/layout/section-header';
import {
  addDays,
  formatDay,
  groupByRep,
  monthGrid,
  parseIso,
  startOfWeek,
  type CalendarEntry,
  type RepDay,
} from '@/features/planning';

/**
 * The calendar's three views. All of them read the same filtered entries; the page
 * owns the date, the filters and what happens when an entry is opened.
 *
 * The palette is deliberately quiet: neutral surfaces, one soft accent per rep as a thin
 * rule, and colour reserved for the two things worth noticing — a call plan versus a
 * visit, and a stop that is done or skipped.
 */

interface ViewProps {
  anchor: string;
  today: string;
  byDate: Map<string, CalendarEntry[]>;
  colorOf: (repId: string | null) => string;
  onOpen: (entry: CalendarEntry) => void;
}

const MUTED_STATUS: Record<string, string> = {
  Completed: 'line-through decoration-muted-foreground/40 text-muted-foreground',
  Skipped: 'line-through decoration-red-400/50 text-muted-foreground',
};

/** One line: `09:00  ABC Depot`. */
function EntryLine({ entry, onOpen }: { entry: CalendarEntry; onOpen: (e: CalendarEntry) => void }) {
  const done = entry.stopStatus ? MUTED_STATUS[entry.stopStatus] : '';
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      title={`${entry.time} · ${entry.title}\n${entry.subtitle}`}
      className="group flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="w-10 flex-shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{entry.time}</span>
      <span className={`min-w-0 flex-1 truncate text-[12px] text-main ${done}`}>{entry.title}</span>
      {entry.kind === 'call' && (
        <span className="flex-shrink-0 rounded px-1 text-[9px] font-semibold uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80 bg-violet-500/[0.07]">
          Call
        </span>
      )}
    </button>
  );
}

/** A rep's name with their entries underneath — the block in the example. */
function RepBlock({
  day,
  onOpen,
  limit,
}: {
  day: RepDay;
  onOpen: (e: CalendarEntry) => void;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = limit && !expanded ? day.entries.slice(0, limit) : day.entries;
  const hidden = day.entries.length - shown.length;

  return (
    <div className="rounded-lg border-l-[3px] bg-muted/25 py-1.5 pl-2 pr-1" style={{ borderLeftColor: day.color }}>
      <div className="flex items-center justify-between px-1.5 pb-0.5">
        <span className="truncate text-[12px] font-semibold text-main">{day.repName}</span>
        <span className="text-[10.5px] tabular-nums text-muted-foreground">{day.entries.length}</span>
      </div>
      {shown.map((entry) => (
        <EntryLine key={entry.id} entry={entry} onOpen={onOpen} />
      ))}
      {limit && day.entries.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

// ── Day ───────────────────────────────────────────────────────────────────────

export function DayView({ anchor, byDate, colorOf, onOpen }: ViewProps) {
  const groups = groupByRep(byDate.get(anchor) ?? [], colorOf);

  if (groups.length === 0) {
    return <EmptyState icon={CalendarX2} title="Nothing planned this day" hint="Try another date or clear the filters." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
      {groups.map((day) => (
        <RepBlock key={day.repId} day={day} onOpen={onOpen} />
      ))}
    </div>
  );
}

// ── Week ──────────────────────────────────────────────────────────────────────

export function WeekView({ anchor, today, byDate, colorOf, onOpen, onPickDay }: ViewProps & { onPickDay: (iso: string) => void }) {
  const monday = startOfWeek(anchor);
  const all = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  // Weekdays always; Saturday and Sunday only when somebody is working them.
  const days = all.filter((iso, i) => i < 5 || (byDate.get(iso)?.length ?? 0) > 0);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-3 min-w-[760px]"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(180px, 1fr))` }}
      >
        {days.map((iso) => {
          const groups = groupByRep(byDate.get(iso) ?? [], colorOf);
          const count = groups.reduce((sum, g) => sum + g.entries.length, 0);
          const isToday = iso === today;
          return (
            <section key={iso} className="min-w-0">
              <button
                type="button"
                onClick={() => onPickDay(iso)}
                className={`mb-2 flex w-full items-baseline justify-between rounded-lg px-2 py-1.5 text-left hover:bg-accent/40 ${
                  isToday ? 'bg-primary/[0.06]' : ''
                }`}
                title="Open this day"
              >
                <span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {formatDay(iso, { weekday: 'short' })}
                  </span>
                  <span className="ml-1.5 text-[13px] font-semibold text-main tabular-nums">{parseIso(iso).getDate()}</span>
                </span>
                <span className="text-[10.5px] tabular-nums text-muted-foreground">{count || ''}</span>
              </button>
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
                {groups.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-surface px-2 py-4 text-center text-[11px] text-muted-foreground">
                    Free
                  </p>
                ) : (
                  groups.map((day) => <RepBlock key={day.repId} day={day} onOpen={onOpen} limit={3} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Month ─────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthView({ anchor, today, byDate, colorOf, onPickDay }: ViewProps & { onPickDay: (iso: string) => void }) {
  const month = parseIso(anchor).getMonth();

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1.5 min-w-[680px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {monthGrid(anchor).map((iso) => {
          const entries = byDate.get(iso) ?? [];
          const groups = groupByRep(entries, colorOf);
          const inMonth = parseIso(iso).getMonth() === month;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDay(iso)}
              className={`flex min-h-[96px] flex-col rounded-lg border p-1.5 text-left transition-colors hover:bg-accent/30 ${
                isToday ? 'border-primary/40' : 'border-surface'
              } ${inMonth ? 'bg-card' : 'bg-muted/20 opacity-50'}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold tabular-nums ${
                  isToday ? 'bg-primary text-primary-foreground' : 'text-main'
                }`}
              >
                {parseIso(iso).getDate()}
              </span>
              {entries.length > 0 && (
                <div className="mt-auto space-y-1 pt-1">
                  <p className="px-0.5 text-[11px] font-semibold text-main tabular-nums">
                    {entries.length} planned
                  </p>
                  <div className="flex flex-wrap gap-1 px-0.5">
                    {groups.slice(0, 8).map((g) => (
                      <span
                        key={g.repId}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: g.color }}
                        title={`${g.repName}: ${g.entries.length}`}
                      />
                    ))}
                    {groups.length > 8 && (
                      <span className="text-[9.5px] leading-none text-muted-foreground">+{groups.length - 8}</span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
