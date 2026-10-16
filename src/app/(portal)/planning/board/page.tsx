'use client';

import { PageBody } from '@/components/layout/page-layout';
import { Card } from '@/components/ui/card';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SkeletonList } from '@/components/feedback/skeletons';
import { EASE } from '@/lib/utilities/motion';
import { useDemoLoading } from '@/hooks/use-demo-loading';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  CheckCircle2,
  GripVertical,
  Inbox,
  Layers,
  Route,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AssignStopDialog, FilterBar, OptimizationPanel, RepAvatar, SalesRepCard, StopCard, STOP_DRAG_TYPE, usePlanning, depotsById, repsById, formatDuration, formatKm, formatTime, PRIORITY_TONE, repColor, type SalesRep, type StopView } from '@/features/planning';

export default function AssignmentBoardPage() {
  const loading = useDemoLoading();
  const {
    unassigned,
    filtered,
    filters,
    reps,
    assignStop,
    unassignStop,
    assignAllVisible,
    reorderStop,
    selectedRepId,
    selectRep,
    selectStop,
    routeFor,
    workloadFor,
    kpis,
  } = usePlanning();

  const [dragActive, setDragActive] = useState(false);
  const [queueOver, setQueueOver] = useState(false);
  const [pickerStop, setPickerStop] = useState<StopView | null>(null);
  const [visibleCount, setVisibleCount] = useState(14);

  // Rep list honours the same filter bar the stops use, so a manager filtering
  // to one sales org sees only that org's team as drop targets.
  const visibleReps = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return reps
      .filter((rep) => {
        if (filters.salesOrg !== 'All' && rep.salesOrg !== filters.salesOrg) return false;
        if (filters.division !== 'All' && rep.division !== filters.division) return false;
        if (filters.province !== 'All' && rep.province !== filters.province) return false;
        if (filters.repId !== 'All' && rep.id !== filters.repId) return false;
        if (q && !`${rep.name} ${rep.employeeId} ${rep.team}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => workloadFor(a.id).ratio - workloadFor(b.id).ratio);
  }, [reps, filters, workloadFor]);

  const focusRep = selectedRepId ? repsById[selectedRepId] : null;
  const focusRoute = selectedRepId ? routeFor(selectedRepId) : null;
  const focusDepot = focusRoute?.stops.length ? depotsById[focusRoute.stops[0].depotId] : null;

  const handleAssign = (stopId: string, rep: SalesRep) => {
    const stop = filtered.find((s) => s.id === stopId);
    assignStop(stopId, rep.id);
    selectRep(rep.id);
    setDragActive(false);
    toast.success(`Assigned to ${rep.name}`, {
      description: stop ? `${stop.customer.name} added to the route.` : undefined,
      action: {
        label: 'Undo',
        onClick: () => unassignStop(stopId),
      },
    });
  };

  const handleQueueDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setQueueOver(false);
    setDragActive(false);
    const stopId = e.dataTransfer.getData(STOP_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
    if (!stopId) return;
    unassignStop(stopId);
    toast.info('Stop returned to the queue');
  };

  const queue = unassigned.slice(0, visibleCount);

  return (
    <PageBody>
      {/* Bulk import moved to Upload Call Plans (/planning/call-plans). */}
      <FilterBar />

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_360px] gap-4">
        {/* ── Stop queue ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <Card
            className={`p-6 rounded-card border-surface card-shadow transition-colors duration-200 ${
              queueOver ? 'border-primary/50 bg-primary/5' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setQueueOver(true);
            }}
            onDragLeave={() => setQueueOver(false)}
            onDrop={handleQueueDrop}
          >
            <SectionHeader
              title="Stop queue"
              subtitle="Drag a stop onto a sales rep"
              icon={Inbox}
              count={unassigned.length}
              action={
                visibleReps.length > 0 &&
                unassigned.length > 0 && (
                  <button
                    onClick={() => {
                      const target = visibleReps[0];
                      const n = assignAllVisible(target.id);
                      selectRep(target.id);
                      toast.success(`${n} stops auto-assigned`, {
                        description: `Balanced onto ${target.name}, the least loaded rep.`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Sparkles size={12} /> Auto-assign
                  </button>
                )
              }
            />

            <AnimatePresence>
              {queueOver && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-3 p-2.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center gap-2">
                    <Undo2 size={13} className="text-primary" />
                    <span className="text-[11px] font-medium text-primary">
                      Drop here to unassign
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {loading ? (
                <SkeletonList count={4} />
              ) : queue.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Queue is clear"
                  hint="Every stop matching the current filters has a sales rep."
                />
              ) : (
                <AnimatePresence mode="popLayout">
                  {queue.map((stop, i) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      index={i}
                      draggable
                      compact
                      showRep={false}
                      onOpen={(s) => selectStop(s.id)}
                      onAssign={(s) => setPickerStop(s)}
                      onDragStateChange={setDragActive}
                    />
                  ))}
                </AnimatePresence>
              )}

              {unassigned.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((c) => c + 14)}
                  className="w-full h-9 rounded-xl border border-surface text-[11.5px] font-medium text-muted-foreground hover:text-main hover:bg-accent/40 transition-colors"
                >
                  Load {Math.min(14, unassigned.length - visibleCount)} more
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* ── Rep drop targets ───────────────────────────────────────────── */}
        <div className="min-w-0">
          <SectionHeader
            title="Sales representatives"
            subtitle={
              dragActive
                ? 'Drop the stop on a rep to assign it'
                : `${kpis.assigned} of ${kpis.total} stops assigned · ${kpis.coverage}% coverage`
            }
            icon={Users}
            count={visibleReps.length}
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonList variant="rep" count={4} />
            </div>
          ) : visibleReps.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No sales rep matches the filters"
              hint="Widen the sales org, division or province filter to see the team."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleReps.map((rep, i) => {
                const load = workloadFor(rep.id);
                return (
                  <SalesRepCard
                    key={rep.id}
                    rep={rep}
                    index={i}
                    stopCount={load.count}
                    routeKm={routeFor(rep.id).distanceKm}
                    droppable
                    dragActive={dragActive}
                    selected={selectedRepId === rep.id}
                    onSelect={(r) => selectRep(selectedRepId === r.id ? null : r.id)}
                    onDropStop={handleAssign}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Selected route ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <Card className="p-6 rounded-card border-surface card-shadow">
            {focusRep && focusRoute ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <RepAvatar rep={focusRep} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-main truncate">{focusRep.name}</p>
                    <p className="text-[10.5px] text-muted-foreground truncate">
                      {focusRep.employeeId} · {focusRep.team}
                    </p>
                  </div>
                  <button
                    onClick={() => selectRep(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/50 transition-colors"
                    aria-label="Clear selection"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <MiniStat label="Stops" value={String(focusRoute.stops.length)} />
                  <MiniStat label="Distance" value={formatKm(focusRoute.distanceKm)} />
                  <MiniStat label="Duration" value={formatDuration(focusRoute.totalMinutes)} />
                </div>

                <SectionHeader
                  title="Route order"
                  subtitle="Drag rows to resequence"
                  icon={Route}
                />

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {focusRoute.stops.map((stop, i) => (
                      <RouteRow
                        key={stop.id}
                        stop={stop}
                        index={i}
                        color={repColor(focusRep.avatarHue)}
                        onOpen={() => selectStop(stop.id)}
                        onRemove={() => {
                          unassignStop(stop.id);
                          toast.info('Stop returned to the queue', {
                            description: stop.customer.name,
                          });
                        }}
                        onDropAt={(stopId) => reorderStop(focusRep.id, stopId, i)}
                        onDragStateChange={setDragActive}
                      />
                    ))}
                  </AnimatePresence>
                  {focusRoute.stops.length === 0 && (
                    <EmptyState
                      icon={Route}
                      title="Empty route"
                      hint="Drop stops onto this rep to build their day."
                    />
                  )}
                </div>

                {focusRoute.stops.length > 0 && (
                  <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-surface text-[11px] text-muted-foreground">
                    <span>Departs 08:00</span>
                    <span className="font-semibold text-main">
                      Finishes {formatTime(focusRoute.finishTime)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No rep selected"
                hint="Select a sales rep to inspect and resequence their route."
              />
            )}
          </Card>

          <OptimizationPanel repId={selectedRepId ?? undefined} />

          <Card className="p-6 rounded-card border-surface card-shadow">
            <SectionHeader title="How assignment works" icon={Layers} />
            <ul className="space-y-2 text-[11.5px] text-muted-foreground">
              <Hint>Drag any stop card onto a sales rep to assign it instantly.</Hint>
              <Hint>Drop a stop back on the queue header to unassign it.</Hint>
              <Hint>On touch devices use the Assign action on each card.</Hint>
              <Hint>Reorder a route by dragging rows in this panel.</Hint>
            </ul>
          </Card>
        </div>
      </div>

      {/* Touch / click assignment path */}
      <AssignStopDialog
        stop={pickerStop}
        onClose={() => setPickerStop(null)}
        onPick={(stop, rep) => {
          handleAssign(stop.id, rep);
          setPickerStop(null);
        }}
      />

    </PageBody>
  );
}

/** Compact, reorderable row inside the selected rep's route. */
function RouteRow({
  stop,
  index,
  color,
  onOpen,
  onRemove,
  onDropAt,
  onDragStateChange,
}: {
  stop: StopView;
  index: number;
  color: string;
  onOpen: () => void;
  onRemove: () => void;
  onDropAt: (stopId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
      transition={{ delay: Math.min(index, 10) * 0.03, duration: 0.3, ease: EASE }}
      draggable
      onDragStart={(e) => {
        const ev = e as unknown as React.DragEvent;
        ev.dataTransfer?.setData(STOP_DRAG_TYPE, stop.id);
        ev.dataTransfer?.setData('text/plain', stop.id);
        onDragStateChange(true);
      }}
      onDragEnd={() => onDragStateChange(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDragStateChange(false);
        const id = e.dataTransfer.getData(STOP_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
        if (id && id !== stop.id) onDropAt(id);
      }) as unknown as (e: unknown) => void}
      className={`group flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-grab active:cursor-grabbing ${
        over ? 'border-primary/50 bg-primary/5' : 'border-surface hover:bg-accent/30'
      }`}
    >
      <GripVertical size={13} className="text-muted-foreground/40 flex-shrink-0" />
      <span
        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
        style={{ background: color }}
      >
        {index + 1}
      </span>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block text-[11.5px] font-medium text-main truncate">
          {stop.customer.name}
        </span>
        <span className="block text-[10px] text-muted-foreground truncate">
          {formatTime(stop.plannedStart)} · {formatKm(stop.distanceKm)}
        </span>
      </button>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: PRIORITY_TONE[stop.priority].hex }}
        title={`${stop.priority} priority`}
      />
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex-shrink-0"
        aria-label="Remove from route"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <p className="text-[9.5px] text-muted-foreground">{label}</p>
      <p className="text-[12px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
