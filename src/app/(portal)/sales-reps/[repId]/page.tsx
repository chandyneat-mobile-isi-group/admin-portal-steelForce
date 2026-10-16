'use client';

/**
 * One sales representative, in four views: who they are, how they are doing, what they
 * are scheduled to do, and which depots they look after.
 *
 * The record and its metrics come from `/api/v1/admin/sales-reps/{id}`; the schedule
 * from the planning board; the depots from the depot master filtered to this rep. Each
 * tab loads only when it is opened.
 */

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, IdCard, Loader2, MapPin, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/shared/status-pill';
import { gradientFor, initialsOf, useSalesRep, type SalesRepDto } from '@/features/sales-reps';
import { DepotsTab, PerformanceTab, SalesInfoTab, ScheduleTab } from './rep-tabs';

const TABS = [
  { key: 'info', label: 'Sales Information', icon: IdCard },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'depots', label: 'Depots', icon: Store },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function SalesRepDetailPage({ params }: { params: { repId: string } }) {
  const [tab, setTab] = useState<TabKey>('info');
  const { data, isLoading, error } = useSalesRep(params.repId);
  const rep = data?.rep;

  return (
    <div className="space-y-5">
      <Link
        href="/sales-reps"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-main"
      >
        <ArrowLeft size={14} /> All sales reps
      </Link>

      {isLoading && (
        <div className="py-20 flex flex-col items-center text-muted-foreground">
          <Loader2 className="animate-spin mb-2" size={22} />
          <p className="text-[12px]">Loading representative…</p>
        </div>
      )}

      {error && !isLoading && (
        <Card className="p-10 text-center rounded-card border-surface">
          <p className="text-[13px] text-red-500">This representative could not be loaded.</p>
        </Card>
      )}

      {rep && data && (
        <>
          <ProfileHeader rep={rep} />

          <div
            role="tablist"
            className="flex gap-1 overflow-x-auto border-b border-surface"
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-main'
                  }`}
                >
                  <t.icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'info' && <SalesInfoTab detail={data} />}
          {tab === 'performance' && <PerformanceTab repId={rep.id} />}
          {tab === 'schedule' && <ScheduleTab rep={rep} activeRoute={data.activeRoute ?? null} />}
          {tab === 'depots' && <DepotsTab repId={rep.id} />}
        </>
      )}
    </div>
  );
}

function ProfileHeader({ rep }: { rep: SalesRepDto }) {
  const m = rep.metrics;
  return (
    <Card className="p-5 sm:p-6 rounded-card border-surface card-shadow">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className={`h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br ${gradientFor(rep.id)} flex items-center justify-center shadow-md`}
          >
            <span className="text-white text-lg font-bold">{initialsOf(rep.name)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-bold text-main truncate">{rep.name}</h1>
              <StatusPill label={rep.isActive ? 'Active' : 'Suspended'} tone={rep.isActive ? 'positive' : 'neutral'} />
            </div>
            <p className="text-[12px] text-muted-foreground truncate">
              {rep.roles.join(', ') || 'No role assigned'}
              {rep.employeeCode && ` · ${rep.employeeCode}`}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin size={12} /> {rep.zone || 'No territory assigned'}
            </p>
          </div>
        </div>

        {/* This month at a glance — the same figures as the card on the board. */}
        <div className="grid grid-cols-3 gap-2 md:w-[360px]">
          {[
            { label: 'Scheduled', value: m.scheduledVisits },
            { label: 'Completed', value: m.completedVisits },
            { label: 'Completion', value: m.successRate == null ? '—' : `${m.successRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
              <p className="text-[16px] font-bold text-main tabular-nums">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
