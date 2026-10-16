'use client';

import { DrawerPanel, DrawerSection } from '@/components/shared/drawer-panel';
import { RepAvatar } from './rep-avatar';
import { usePlanning } from '@/features/planning/store';
import { formatDuration, formatKm } from '@/features/planning/lib/geo';
import { repColor } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import { customersById, repsById } from '@/features/planning/data/demo-data';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Loader2,
  Printer,
  Route,
  Save,
  Send,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { csvBlob } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';

export function PlanSummaryDrawer() {
  const {
    summaryOpen,
    setSummaryOpen,
    stops,
    kpis,
    routeFor,
    published,
    publish,
    filters,
    selectRep,
  } = usePlanning();
  const [publishing, setPublishing] = useState(false);

  const perRep = useMemo(() => {
    const ids = Array.from(new Set(stops.map((s) => s.repId).filter(Boolean) as string[]));
    return ids
      .map((id) => ({ rep: repsById[id], route: routeFor(id) }))
      .filter((r) => Boolean(r.rep))
      .sort((a, b) => b.route.stops.length - a.route.stops.length);
  }, [stops, routeFor]);

  const totals = useMemo(() => {
    const distance = perRep.reduce((sum, r) => sum + r.route.distanceKm, 0);
    const travel = perRep.reduce((sum, r) => sum + r.route.travelMinutes, 0);
    const service = perRep.reduce((sum, r) => sum + r.route.serviceMinutes, 0);
    const latest = perRep.reduce(
      (max, r) => (r.route.finishTime > max ? r.route.finishTime : max),
      '08:00'
    );
    return { distance, travel, service, latest };
  }, [perRep]);

  const exportCsv = () => {
    const header = [
      'Stop ID', 'Sequence', 'Planned start', 'Customer code', 'Customer', 'Type',
      'Province', 'District', 'Priority', 'Status', 'Sales rep', 'Employee ID',
      'Distance km', 'Minutes on site',
    ];
    const rows = stops
      .slice()
      .sort((a, b) => (a.repId ?? 'zzz').localeCompare(b.repId ?? 'zzz') || a.seq - b.seq)
      .map((s) => {
        const c = customersById[s.customerId];
        const rep = s.repId ? repsById[s.repId] : null;
        return [
          s.id, s.seq, s.plannedStart, c.code, c.name, c.type, c.province, c.district,
          s.priority, s.status, rep?.name ?? 'Unassigned', rep?.employeeId ?? '',
          s.distanceKm, s.estimatedMinutes,
        ];
      });

    saveBlob(csvBlob(header, rows), `steelforce-stop-plan-${filters.visitDate}.csv`);
    toast.success('Plan exported', { description: `${rows.length} stops written to CSV.` });
  };

  const doPublish = async () => {
    setPublishing(true);
    await publish();
    setPublishing(false);
    toast.success('Assignment published', {
      description: `${kpis.assigned} stops sent to ${perRep.length} sales reps.`,
    });
  };

  return (
    <DrawerPanel
      open={summaryOpen}
      onClose={() => setSummaryOpen(false)}
      title="Assignment summary"
      subtitle={`Visit date ${filters.visitDate}`}
      icon={ClipboardCheck}
      footer={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toast.success('Plan saved as draft', { description: 'You can publish it later.' })}
              className="h-10 rounded-xl border border-surface text-[12px] font-semibold text-main hover:bg-accent/50 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Save size={14} /> Save plan
            </button>
            <button
              onClick={doPublish}
              disabled={publishing || published}
              className="h-10 rounded-xl gradient-primary text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-70 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
            >
              {publishing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Publishing…
                </>
              ) : published ? (
                <>
                  <CheckCircle2 size={14} /> Published
                </>
              ) : (
                <>
                  <Send size={14} /> Publish
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportCsv}
              className="h-9 rounded-xl border border-surface text-[11.5px] font-medium text-muted-foreground hover:text-main hover:bg-accent/50 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="h-9 rounded-xl border border-surface text-[11.5px] font-medium text-muted-foreground hover:text-main hover:bg-accent/50 flex items-center justify-center gap-1.5 transition-all"
            >
              <Printer size={13} /> Print / PDF
            </button>
          </div>
        </div>
      }
    >
      {/* Coverage ring */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-surface">
        <CoverageRing value={kpis.coverage} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold text-main">
            {kpis.assigned} of {kpis.total} stops assigned
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {kpis.unassigned} still in the queue · {perRep.length} reps engaged
          </p>
          <AnimatePresence>
            {published && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1"
              >
                <CheckCircle2 size={11} /> Published to the field app
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-2">
        <Tile icon={Route} label="Estimated distance" value={formatKm(totals.distance)} />
        <Tile icon={Clock} label="Estimated travel" value={formatDuration(totals.travel)} />
        <Tile icon={Users} label="Time on site" value={formatDuration(totals.service)} />
        <Tile icon={Clock} label="Latest finish" value={totals.latest} />
      </div>

      {kpis.unassigned > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-amber-700 dark:text-amber-400 leading-relaxed">
            {kpis.unassigned} stops are unassigned. Publishing now sends only the assigned routes.
          </p>
        </div>
      )}

      {/* Per-rep breakdown */}
      <DrawerSection title={`Routes (${perRep.length})`}>
        <div className="space-y-1.5">
          {perRep.map(({ rep, route }, i) => {
            const color = repColor(rep.avatarHue);
            const load = Math.min(1, route.stops.length / rep.capacity);
            return (
              <motion.button
                key={rep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.035, duration: 0.3, ease: EASE }}
                onClick={() => {
                  selectRep(rep.id);
                  setSummaryOpen(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl border border-surface hover:bg-accent/40 transition-colors text-left"
              >
                <RepAvatar rep={rep} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-main truncate">{rep.name}</p>
                  <div className="h-1 rounded-full bg-muted/70 overflow-hidden mt-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${load * 100}%` }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11.5px] font-semibold text-main tabular-nums">
                    {route.stops.length} stops
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatKm(route.distanceKm)} · {formatDuration(route.totalMinutes)}
                  </p>
                </div>
              </motion.button>
            );
          })}
          {perRep.length === 0 && (
            <p className="text-[11.5px] text-muted-foreground text-center py-5">
              No routes yet — assign stops to build the plan
            </p>
          )}
        </div>
      </DrawerSection>
    </DrawerPanel>
  );
}

function CoverageRing({ value }: { value: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-[68px] h-[68px] flex-shrink-0">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" strokeWidth="7" className="stroke-muted" />
        <motion.circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-main tabular-nums">
        {value}%
      </span>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-surface p-3">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mb-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-[14px] font-bold text-main tabular-nums">{value}</p>
    </div>
  );
}
