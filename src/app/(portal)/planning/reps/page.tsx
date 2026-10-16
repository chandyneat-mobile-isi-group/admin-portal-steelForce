'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { Card } from '@/components/ui/card';
import { FilterChip } from '@/components/forms/filter-chip';
import { SearchBar } from '@/components/forms/search-bar';
import { SectionHeader, EmptyState } from '@/components/layout/section-header';
import { SkeletonList } from '@/components/feedback/skeletons';
import { SummaryCard } from '@/components/shared/summary-card';
import { useDemoLoading } from '@/hooks/use-demo-loading';
import {
  Building2,
  Layers,
  MapPin,
  Navigation,
  Route,
  Signal,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { MapCanvas, RouteTimeline, SalesRepCard, RepAvatar, MetaChip, RepStatusBadge, usePlanning, depotsById, depots, formatDuration, formatKm, formatTime, repColor, DIVISIONS, PROVINCES, REP_STATUSES, SALES_ORGS, TEAMS } from '@/features/planning';

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export default function SalesRepsPage() {
  const loading = useDemoLoading();
  const { reps, selectedRepId, selectRep, selectStop, routeFor, workloadFor, stopViews } =
    usePlanning();

  const [query, setQuery] = useState('');
  const [team, setTeam] = useState('All');
  const [org, setOrg] = useState('All');
  const [division, setDivision] = useState('All');
  const [province, setProvince] = useState('All');
  const [status, setStatus] = useState('All');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reps.filter((rep) => {
      if (team !== 'All' && rep.team !== team) return false;
      if (org !== 'All' && rep.salesOrg !== org) return false;
      if (division !== 'All' && rep.division !== division) return false;
      if (province !== 'All' && rep.province !== province) return false;
      if (status !== 'All' && rep.status !== status) return false;
      if (q && !`${rep.name} ${rep.employeeId} ${rep.team} ${rep.currentLocation}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [reps, query, team, org, division, province, status]);

  const selected = selectedRepId ? reps.find((r) => r.id === selectedRepId) ?? null : null;
  const route = selectedRepId ? routeFor(selectedRepId) : null;
  const routeDepot = route?.stops.length ? depotsById[route.stops[0].depotId] : depots[0];

  const teamStats = useMemo(() => {
    const online = reps.filter((r) => r.online).length;
    const totalCapacity = reps.reduce((sum, r) => sum + r.capacity, 0);
    const assignedStops = stopViews.filter((s) => s.repId).length;
    const covered = reps.reduce((sum, r) => sum + r.distanceCovered, 0);
    return { online, totalCapacity, assignedStops, covered: Math.round(covered) };
  }, [reps, stopViews]);

  return (
    <PageBody>
      {/* Same surface, sticky offset and control gap as the FilterBar on the
          other tabs, so the toolbar never shifts when switching pages. */}
      <PageToolbar>
        <ToolbarRow>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search sales rep, ID or location…"
            className="w-full sm:w-[300px]"
          />
          <FilterChip label="Team" icon={Users} value={team} options={opts(TEAMS)} onChange={setTeam} allLabel="All teams" />
          <FilterChip label="Sales Org" icon={Building2} value={org} options={opts(SALES_ORGS)} onChange={setOrg} allLabel="All sales orgs" />
          <FilterChip label="Division" icon={Layers} value={division} options={opts(DIVISIONS)} onChange={setDivision} allLabel="All divisions" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" />
          <FilterChip label="Status" icon={Signal} value={status} options={opts(REP_STATUSES)} onChange={setStatus} allLabel="Any status" />
        </ToolbarRow>
      </PageToolbar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard index={0} label="Field team" value={reps.length} icon={Users} color="#004A98" hint="Sales representatives" />
        <SummaryCard
          index={1}
          label="Online now"
          value={teamStats.online}
          icon={Signal}
          color="#2C9942"
          progress={(teamStats.online / reps.length) * 100}
        />
        <SummaryCard
          index={2}
          label="Capacity used"
          value={teamStats.totalCapacity ? Math.round((teamStats.assignedStops / teamStats.totalCapacity) * 100) : 0}
          suffix="%"
          icon={Layers}
          color="#D47C17"
          progress={teamStats.totalCapacity ? (teamStats.assignedStops / teamStats.totalCapacity) * 100 : 0}
          hint={`${teamStats.assignedStops} of ${teamStats.totalCapacity} slots`}
        />
        <SummaryCard
          index={3}
          label="Distance covered"
          value={teamStats.covered}
          suffix=" km"
          icon={Navigation}
          color="#5E53AE"
          hint="Recorded by the field app today"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <div className="min-w-0">
          <SectionHeader
            title="Sales representatives"
            subtitle="Select a rep to highlight their stops on the map"
            icon={UserCheck}
            count={visible.length}
          />
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonList variant="rep" count={6} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={Users} title="No sales rep matches" hint="Adjust the filters above to widen the search." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visible.map((rep, i) => (
                <SalesRepCard
                  key={rep.id}
                  rep={rep}
                  index={i}
                  stopCount={workloadFor(rep.id).count}
                  routeKm={routeFor(rep.id).distanceKm}
                  selected={selectedRepId === rep.id}
                  onSelect={(r) => selectRep(selectedRepId === r.id ? null : r.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail rail */}
        <div className="min-w-0 space-y-4">
          <Card className="p-6 rounded-card border-surface card-shadow">
            {selected && route ? (
              <>
                <div className="flex items-start gap-3">
                  <RepAvatar rep={selected} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-main truncate">{selected.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selected.employeeId} · {selected.phone}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <RepStatusBadge status={selected.status} />
                      <MetaChip label={selected.team} />
                      <MetaChip label={selected.province} icon={MapPin} />
                    </div>
                  </div>
                  <button
                    onClick={() => selectRep(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/50 transition-colors flex-shrink-0"
                    aria-label="Clear selection"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Tile label="Stops today" value={String(route.stops.length)} icon={Route} />
                  <Tile label="Route distance" value={formatKm(route.distanceKm)} icon={Navigation} />
                  <Tile label="Total duration" value={formatDuration(route.totalMinutes)} icon={Layers} />
                  <Tile label="Rating" value={selected.rating.toFixed(1)} icon={Star} />
                </div>

                <div className="mt-4 pt-4 border-t border-surface">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Current location
                  </p>
                  <p className="text-[12px] text-main flex items-center gap-1.5">
                    <MapPin size={12} className="text-primary" /> {selected.currentLocation}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-1">
                    Shift {selected.shift} · finishes {formatTime(route.finishTime)}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState
                icon={UserCheck}
                title="Select a sales rep"
                hint="Their route, live position and assigned stops appear here."
              />
            )}
          </Card>

          <MapCanvas
            stops={stopViews}
            depots={depots}
            reps={selected ? [selected] : reps.filter((r) => r.online)}
            routeStops={route?.stops ?? []}
            routeDepot={routeDepot}
            routeColor={selected ? repColor(selected.avatarHue) : '#004A98'}
            onSelectStop={(stop) => selectStop(stop.id)}
            onOpenStop={(stop) => selectStop(stop.id)}
            className="h-[300px]"
          />

          {route && route.stops.length > 0 && (
            <Card className="p-6 rounded-card border-surface card-shadow">
              <SectionHeader title="Planned route" icon={Route} count={route.stops.length} />
              <div className="max-h-[400px] overflow-y-auto pr-1">
                <RouteTimeline
                  stops={route.stops}
                  depot={routeDepot}
                  accent={selected ? repColor(selected.avatarHue) : undefined}
                  onSelect={(stop) => selectStop(stop.id)}
                  compact
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageBody>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Route;
}) {
  return (
    <div className="rounded-xl border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mb-1">
        <Icon size={10} /> {label}
      </p>
      <p className="text-[13px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
