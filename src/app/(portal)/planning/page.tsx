'use client';

import { PageBody } from '@/components/layout/page-layout';
import { Card } from '@/components/ui/card';
import { SummaryCard } from '@/components/shared/summary-card';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SkeletonList } from '@/components/feedback/skeletons';
import { EASE } from '@/lib/utilities/motion';
import { useDemoLoading } from '@/hooks/use-demo-loading';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers,
  MapPin,
  Navigation,
  Percent,
  Route,
  Timer,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { MapCanvas, OptimizationPanel, RouteTimeline, RepAvatar, LiveDot, MetaChip, StatusBadge, usePlanning, depots, depotsById, formatDuration, formatKm, formatTime, STATUS_TONE, repColor, STOP_STATUSES } from '@/features/planning';

export default function PlanningOverviewPage() {
  const loading = useDemoLoading();
  const { kpis, stopViews, reps, selectedRepId, selectRep, selectStop, routeFor, workloadFor } =
    usePlanning();

  const workload = useMemo(
    () =>
      reps
        .map((rep) => ({ rep, load: workloadFor(rep.id) }))
        .filter((w) => w.load.count > 0)
        .sort((a, b) => b.load.count - a.load.count),
    [reps, workloadFor]
  );

  const focusRepId = selectedRepId ?? workload[0]?.rep.id ?? null;
  const focusRep = focusRepId ? reps.find((r) => r.id === focusRepId) ?? null : null;
  const focusRoute = focusRepId ? routeFor(focusRepId) : null;
  const focusDepot = focusRoute?.stops.length ? depotsById[focusRoute.stops[0].depotId] : depots[0];

  const statusBreakdown = useMemo(
    () =>
      STOP_STATUSES.map((status) => ({
        status,
        count: stopViews.filter((s) => s.status === status).length,
      })),
    [stopViews]
  );

  const liveFeed = useMemo(
    () =>
      stopViews
        .filter((s) => s.status === 'In Progress' || s.status === 'Completed')
        .sort((a, b) => b.plannedStart.localeCompare(a.plannedStart))
        .slice(0, 6),
    [stopViews]
  );

  const onlineReps = useMemo(() => reps.filter((r) => r.online), [reps]);

  return (
    <PageBody>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {loading ? (
          <SkeletonList variant="kpi" count={8} />
        ) : (
          <>
            <SummaryCard
              index={0}
              label="Today's stops"
              value={kpis.total}
              icon={ClipboardList}
              color="#004A98"
              hint="Planned for 6 Aug 2026"
              spark={[62, 71, 68, 84, 79, 92, 100]}
            />
            <SummaryCard
              index={1}
              label="Assigned"
              value={kpis.assigned}
              icon={CheckCircle2}
              color="#2C9942"
              progress={kpis.coverage}
              hint={`${kpis.coverage}% of the day covered`}
            />
            <SummaryCard
              index={2}
              label="Pending"
              value={kpis.unassigned}
              icon={Timer}
              color="#D47C17"
              progress={kpis.total ? (kpis.unassigned / kpis.total) * 100 : 0}
              hint="Waiting in the stop queue"
            />
            <SummaryCard
              index={3}
              label="Completed"
              value={kpis.completed}
              icon={Route}
              color="#2571C2"
              progress={kpis.total ? (kpis.completed / kpis.total) * 100 : 0}
              hint={`${kpis.inProgress} visits in progress`}
            />
            <SummaryCard
              index={4}
              label="Reps working"
              value={kpis.repsWorking}
              icon={Users}
              color="#5E53AE"
              progress={(kpis.repsWorking / reps.length) * 100}
              hint={`of ${reps.length} in the field team`}
            />
            <SummaryCard
              index={5}
              label="Coverage"
              value={kpis.coverage}
              suffix="%"
              icon={Percent}
              color="#C33A50"
              progress={kpis.coverage}
              spark={[48, 55, 61, 66, 71, 74, kpis.coverage]}
            />
            <SummaryCard
              index={6}
              label="Avg distance"
              value={kpis.avgDistance}
              suffix=" km"
              decimals={1}
              icon={Navigation}
              color="#2C9942"
              hint={`${kpis.totalDistance} km planned in total`}
            />
            <SummaryCard
              index={7}
              label="Planned order value"
              value={Math.round(kpis.orderValue / 1000)}
              prefix="$"
              suffix="k"
              icon={Activity}
              color="#E0592A"
              spark={[30, 42, 38, 55, 61, 58, 72]}
            />
          </>
        )}
      </div>

      {/* Map + side rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div>
            <SectionHeader
              title="Field coverage"
              subtitle="Live positions, depots and every planned stop"
              icon={MapPin}
              action={
                <Link
                  href="/planning/map"
                  className="text-[11.5px] font-medium text-primary hover:underline"
                >
                  Open full map
                </Link>
              }
            />
            {/*
              Coverage, not a route. Every stop is drawn as a depot pin and no route
              polyline is passed — the map answers "where are we covering today", and a
              line through one representative's day answers a different question that
              the timeline below and the Assignment Board already answer better.

              Omitting routeStops is what removes the polyline: the basemaps draw one
              only when they are given an ordered list.
            */}
            <MapCanvas
              stops={stopViews}
              depots={depots}
              reps={onlineReps}
              stopIcon="depot"
              onSelectStop={(stop) => selectStop(stop.id)}
              onOpenStop={(stop) => selectStop(stop.id)}
              className="h-[420px] sm:h-[480px]"
            />
          </div>

          {/* Status distribution */}
          <Card className="p-6 rounded-card border-surface card-shadow">
            <SectionHeader title="Stop status distribution" icon={Layers} />
            <div className="space-y-2.5">
              {statusBreakdown.map((row, i) => {
                const tone = STATUS_TONE[row.status];
                const pct = kpis.total ? (row.count / kpis.total) * 100 : 0;
                return (
                  <div key={row.status} className="flex items-center gap-3">
                    <span className="w-24 text-[11.5px] text-muted-foreground flex-shrink-0">
                      {row.status}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted/70 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: tone.hex }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: EASE }}
                      />
                    </div>
                    <span className="w-14 text-right text-[11.5px] font-semibold text-main tabular-nums flex-shrink-0">
                      {row.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <OptimizationPanel repId={focusRepId ?? undefined} />

          {/* Team workload */}
          <Card className="p-6 rounded-card border-surface card-shadow">
            <SectionHeader
              title="Team workload"
              subtitle="Busiest routes today"
              icon={Users}
              count={workload.length}
              action={
                <Link href="/sales-reps" className="text-[11px] font-medium text-primary hover:underline">
                  All reps
                </Link>
              }
            />
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {loading ? (
                <SkeletonList variant="rep" count={2} />
              ) : (
                workload.slice(0, 7).map(({ rep, load }, i) => {
                  const color = repColor(rep.avatarHue);
                  const active = focusRepId === rep.id;
                  return (
                    <motion.button
                      key={rep.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease: EASE }}
                      onClick={() => selectRep(active ? null : rep.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-colors text-left ${
                        active ? 'bg-primary/5' : 'hover:bg-accent/40'
                      }`}
                    >
                      <RepAvatar rep={rep} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-main truncate">
                          {rep.name}
                        </span>
                        <span className="block h-1 rounded-full bg-muted/70 overflow-hidden mt-1.5">
                          <motion.span
                            className="block h-full rounded-full"
                            style={{ background: color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(1, load.ratio) * 100}%` }}
                            transition={{ duration: 0.6, ease: EASE }}
                          />
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                        {load.count}/{load.capacity}
                      </span>
                    </motion.button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Live activity */}
          <Card className="p-6 rounded-card border-surface card-shadow">
            <SectionHeader title="Live activity" icon={Activity} />
            <div className="space-y-2">
              {liveFeed.map((stop, i) => (
                <motion.button
                  key={stop.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                  onClick={() => selectStop(stop.id)}
                  className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-accent/40 transition-colors text-left"
                >
                  {stop.status === 'In Progress' ? (
                    <span className="mt-1.5">
                      <LiveDot color={STATUS_TONE['In Progress'].hex} />
                    </span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: STATUS_TONE[stop.status].hex }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-medium text-main truncate">
                      {stop.customer.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {formatTime(stop.plannedStart)} · {stop.customer.district}
                    </span>
                  </span>
                  <StatusBadge status={stop.status} />
                </motion.button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Focus route timeline */}
      <Card className="p-6 rounded-card border-surface card-shadow">
        <SectionHeader
          title={focusRep ? `${focusRep.name}'s route` : 'Route timeline'}
          subtitle={
            focusRoute
              ? `${focusRoute.stops.length} stops · ${formatKm(focusRoute.distanceKm)} · finishes ${formatTime(
                  focusRoute.finishTime
                )}`
              : 'Select a rep to see the planned day'
          }
          icon={Clock}
          action={
            focusRep && (
              <div className="flex items-center gap-1.5">
                <MetaChip label={focusRep.team} />
                <MetaChip label={focusRep.salesOrg} />
              </div>
            )
          }
        />
        {focusRoute && focusRoute.stops.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <RouteTimeline
              stops={focusRoute.stops.slice(0, Math.ceil(focusRoute.stops.length / 2))}
              depot={focusDepot}
              accent={focusRep ? repColor(focusRep.avatarHue) : undefined}
              onSelect={(stop) => selectStop(stop.id)}
            />
            <RouteTimeline
              stops={focusRoute.stops.slice(Math.ceil(focusRoute.stops.length / 2))}
              accent={focusRep ? repColor(focusRep.avatarHue) : undefined}
              onSelect={(stop) => selectStop(stop.id)}
            />
          </div>
        ) : (
          <EmptyState
            icon={Route}
            title="No route to show yet"
            hint="Assign stops on the board, then come back to review the day."
          />
        )}
        {focusRoute && focusRoute.stops.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-surface text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Navigation size={12} /> {formatKm(focusRoute.distanceKm)} total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} /> {formatDuration(focusRoute.travelMinutes)} driving
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Timer size={12} /> {formatDuration(focusRoute.serviceMinutes)} on site
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity size={12} /> ${focusRoute.orderValue.toLocaleString()} expected orders
            </span>
          </div>
        )}
      </Card>
    </PageBody>
  );
}
