'use client';

/**
 * Live Map — the full-height view of where the field team is.
 *
 * ## Why this file exists
 *
 * Two places already linked here — the "Live Map" tab in `PlanningNav` and the "Open
 * full map" link on the overview — but the route was never created, so both 404'd. The
 * page is written to match what those links promise rather than inventing a new screen.
 *
 * ## How it differs from the overview's Field coverage map
 *
 * Coverage answers "where are we today", so it draws every stop as a depot pin and no
 * route line. **This map is the one that draws routes** — it is the screen a supervisor
 * opens to follow one representative's day, so selecting a rep is the whole point and
 * the polyline appears with them. With nobody selected it shows the same unrouted
 * coverage picture, which is the honest default: a line through an arbitrary rep would
 * be a claim nobody asked for.
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import { Clock, MapPin, Navigation, Route as RouteIcon, Users, X } from 'lucide-react';
import {
  LiveDot,
  MapCanvas,
  RepAvatar,
  STATUS_TONE,
  STOP_STATUSES,
  depots,
  depotsById,
  formatDuration,
  formatKm,
  formatTime,
  repColor,
  usePlanning,
} from '@/features/planning';

export default function PlanningMapPage() {
  const { stopViews, reps, selectedRepId, selectRep, selectStop, routeFor, kpis } = usePlanning();

  const onlineReps = useMemo(() => reps.filter((rep) => rep.online), [reps]);

  const focusRep = selectedRepId ? (reps.find((rep) => rep.id === selectedRepId) ?? null) : null;
  const focusRoute = focusRep ? routeFor(focusRep.id) : null;

  // The depot the drawn route starts from. Only meaningful with a rep selected — with
  // nobody chosen there is no route, so no origin to anchor one to.
  const focusDepot = focusRoute?.stops.length ? (depotsById[focusRoute.stops[0].depotId] ?? depots[0]) : null;

  const statusCounts = useMemo(
    () =>
      STOP_STATUSES.map((status) => ({
        status,
        count: stopViews.filter((stop) => stop.status === status).length,
      })).filter((entry) => entry.count > 0),
    [stopViews]
  );

  // With a rep selected the map is about their day, so the reps layer narrows to them —
  // leaving every pin on screen would make the followed rep impossible to pick out.
  const repsOnMap = focusRep ? onlineReps.filter((rep) => rep.id === focusRep.id) : onlineReps;

  return (
    <PageBody>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <Card className="p-0 overflow-hidden rounded-card border-surface card-shadow">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-surface">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-muted-foreground" />
                <span className="text-[13px] font-600 text-main" style={{ fontWeight: 600 }}>
                  {focusRep ? `${focusRep.name}'s route` : 'Live field map'}
                </span>
              </div>

              {focusRep ? (
                <button
                  onClick={() => selectRep(null)}
                  className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-main transition-colors"
                >
                  <X size={12} /> Clear selection
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  {kpis.total} stops · {onlineReps.length} rep{onlineReps.length === 1 ? '' : 's'} online
                </span>
              )}
            </div>

            <MapCanvas
              stops={stopViews}
              depots={depots}
              reps={repsOnMap}
              // Passed only when a rep is selected; the basemaps draw a polyline solely
              // when they are handed an ordered list, so this is what turns it on.
              routeStops={focusRoute?.stops ?? []}
              routeDepot={focusDepot}
              routeColor={focusRep ? repColor(focusRep.avatarHue) : undefined}
              onSelectStop={(stop) => selectStop(stop.id)}
              onOpenStop={(stop) => selectStop(stop.id)}
              className="h-[calc(100vh-280px)] min-h-[420px]"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Follow a rep" subtitle="Draws their day on the map" icon={Users} />
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {reps.map((rep) => {
                const active = selectedRepId === rep.id;
                const load = routeFor(rep.id);

                return (
                  <button
                    key={rep.id}
                    onClick={() => selectRep(active ? null : rep.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors ${
                      active ? 'bg-primary/5' : 'hover:bg-accent/40'
                    }`}
                  >
                    <RepAvatar rep={rep} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-main truncate">{rep.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {load.stops.length} stop{load.stops.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    {rep.online && <LiveDot color={STATUS_TONE['In Progress'].hex} />}
                  </button>
                );
              })}
            </div>
          </Card>

          {focusRoute && focusRoute.stops.length > 0 && (
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Route summary" icon={RouteIcon} />
              <div className="space-y-2 text-[11.5px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Navigation size={12} /> {formatKm(focusRoute.distanceKm)} total
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} /> {formatDuration(focusRoute.travelMinutes)} driving
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} /> finishes {formatTime(focusRoute.finishTime)}
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Legend" icon={MapPin} />
            <div className="space-y-1.5">
              {statusCounts.map((entry) => (
                <div key={entry.status} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_TONE[entry.status].hex }}
                  />
                  <span className="text-[11.5px] text-muted-foreground flex-1">{entry.status}</span>
                  <span className="text-[11.5px] font-semibold text-main tabular-nums">{entry.count}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1.5 mt-1.5 border-t border-surface">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#011E41] flex-shrink-0" />
                <span className="text-[11.5px] text-muted-foreground flex-1">Depot</span>
                <span className="text-[11.5px] font-semibold text-main tabular-nums">{depots.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
