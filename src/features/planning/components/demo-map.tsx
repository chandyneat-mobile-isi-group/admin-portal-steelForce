'use client';

import { AREA_LABELS, HIGHWAYS, LAKES, RIVERS, STREETS } from '@/features/planning/lib/map-geometry';
import { boundsOf, project, type Bounds } from '@/features/planning/lib/geo';
import { customerTypeIcon, PRIORITY_TONE, STATUS_TONE, repColor } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import type { LatLng, StopView } from '@/features/planning/types';
import { LivePresence, MapMarker } from './map-marker';
import { StopPopupCard } from './stop-popup-card';
import type { StopMapProps } from './map-types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Crosshair,
  Layers,
  Minus,
  Navigation,
  Plus,
  Route as RouteIcon,
  Warehouse,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

export function DemoMap({
  stops,
  depots = [],
  reps = [],
  routeStops = [],
  stopIcon = 'customerType',
  routeDepot = null,
  routeColor = '#004A98',
  selectedStopId = null,
  onSelectStop,
  onOpenStop,
  onAssignStop,
  className = 'h-[520px]',
  maxMarkers = 120,
  colorBy = 'priority',
}: StopMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showReps, setShowReps] = useState(true);
  const dragOrigin = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const visible = useMemo(() => stops.slice(0, maxMarkers), [stops, maxMarkers]);

  const bounds: Bounds = useMemo(() => {
    const pts: LatLng[] = [
      ...visible.map((s) => s.customer),
      ...depots,
      ...(routeDepot ? [routeDepot] : []),
    ];
    return boundsOf(pts.length ? pts : depots, 0.16);
  }, [visible, depots, routeDepot]);

  const toPath = useCallback(
    (points: LatLng[], close = false) => {
      const d = points
        .map((p, i) => {
          const { x, y } = project(p, bounds);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
      return close ? `${d} Z` : d;
    },
    [bounds]
  );

  const routePath = useMemo(() => {
    if (routeStops.length === 0) return '';
    const pts: LatLng[] = [];
    if (routeDepot) pts.push(routeDepot);
    routeStops.forEach((s) => pts.push(s.customer));
    if (routeDepot) pts.push(routeDepot);
    return toPath(pts);
  }, [routeStops, routeDepot, toPath]);

  const routeIds = useMemo(() => new Set(routeStops.map((s) => s.id)), [routeStops]);
  const opened = useMemo(() => visible.find((s) => s.id === openId) ?? null, [visible, openId]);
  const counterScale = 1 / zoom;

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const stepZoom = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((z + delta).toFixed(2)))));

  return (
    <div
      className={`relative overflow-hidden rounded-card border border-surface card-shadow bg-card-surface ${className}`}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 6) return;
        e.preventDefault();
        stepZoom(e.deltaY > 0 ? -0.2 : 0.2);
      }}
    >
      {/* Pannable / zoomable canvas */}
      <div
        className={`absolute inset-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={(e) => {
          dragOrigin.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragOrigin.current) return;
          const o = dragOrigin.current;
          setPan({ x: o.px + (e.clientX - o.x), y: o.py + (e.clientY - o.y) });
        }}
        onPointerUp={() => {
          dragOrigin.current = null;
          setDragging(false);
        }}
        onPointerLeave={() => {
          dragOrigin.current = null;
          setDragging(false);
        }}
        onClick={() => setOpenId(null)}
      >
        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ scale: zoom, x: pan.x, y: pan.y }}
          transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        >
          <MapBase toPath={toPath} />
          {showLabels && <AreaLabels bounds={bounds} counterScale={counterScale} />}

          {/* Route polyline */}
          {routePath && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <motion.path
                d={routePath}
                fill="none"
                stroke={routeColor}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.28}
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: EASE }}
              />
              <motion.path
                d={routePath}
                fill="none"
                stroke={routeColor}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 7"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, strokeDashoffset: [0, -48] }}
                transition={{
                  pathLength: { duration: 1.1, ease: EASE },
                  strokeDashoffset: { duration: 2.4, repeat: Infinity, ease: 'linear' },
                }}
              />
            </svg>
          )}

          {/* Rep live positions */}
          {showReps &&
            reps.map((rep) => {
              const { x, y } = project(rep, bounds);
              return (
                <LivePresence
                  key={rep.id}
                  x={x}
                  y={y}
                  color={repColor(rep.avatarHue)}
                  counterScale={counterScale}
                  label={`${rep.name} · ${rep.currentLocation}`}
                />
              );
            })}

          {/* Depots */}
          {depots.map((d, i) => {
            const { x, y } = project(d, bounds);
            return (
              <MapMarker
                key={d.id}
                x={x}
                y={y}
                color="#011E41"
                icon={Warehouse}
                size="lg"
                index={i}
                counterScale={counterScale}
                title={d.name}
              />
            );
          })}

          {/* Stops */}
          {visible.map((stop, i) => {
            const { x, y } = project(stop.customer, bounds);
            const tone = colorBy === 'status' ? STATUS_TONE[stop.status] : PRIORITY_TONE[stop.priority];
            const inRoute = routeIds.has(stop.id);
            const dimmed = routeStops.length > 0 && !inRoute;
            const seq = inRoute ? routeStops.findIndex((s) => s.id === stop.id) + 1 : undefined;
            return (
              <div key={stop.id} style={{ opacity: dimmed ? 0.32 : 1 }}>
                <MapMarker
                  x={x}
                  y={y}
                  color={inRoute ? routeColor : tone.hex}
                  icon={stopIcon === 'depot' ? Warehouse : customerTypeIcon(stop.customer.type)}
                  seq={seq}
                  index={i}
                  counterScale={counterScale}
                  selected={selectedStopId === stop.id || openId === stop.id}
                  pulse={stop.status === 'In Progress'}
                  title={stop.customer.name}
                  onClick={() => {
                    setOpenId((prev) => (prev === stop.id ? null : stop.id));
                    onSelectStop?.(stop);
                  }}
                />
              </div>
            );
          })}

          {/* Marker popup */}
          <AnimatePresence>
            {opened && (
              <MarkerPopup
                stop={opened}
                bounds={bounds}
                counterScale={counterScale}
                onOpen={onOpenStop}
                onAssign={onAssignStop}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 z-50 flex flex-col gap-1.5">
        <ControlGroup>
          <ControlButton onClick={() => stepZoom(0.4)} label="Zoom in">
            <Plus size={14} />
          </ControlButton>
          <div className="h-px bg-border" />
          <ControlButton onClick={() => stepZoom(-0.4)} label="Zoom out">
            <Minus size={14} />
          </ControlButton>
          <div className="h-px bg-border" />
          <ControlButton onClick={resetView} label="Reset view">
            <Crosshair size={14} />
          </ControlButton>
        </ControlGroup>
        <ControlGroup>
          <ControlButton
            onClick={() => setShowLabels((v) => !v)}
            label="Toggle labels"
            active={showLabels}
          >
            <Layers size={14} />
          </ControlButton>
          <div className="h-px bg-border" />
          <ControlButton
            onClick={() => setShowReps((v) => !v)}
            label="Toggle live reps"
            active={showReps}
          >
            <Navigation size={14} />
          </ControlButton>
        </ControlGroup>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-50 glass rounded-xl px-3 py-2.5 card-shadow">
        <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {colorBy === 'status' ? 'Stop status' : 'Priority'}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-w-[260px]">
          {Object.entries(colorBy === 'status' ? STATUS_TONE : PRIORITY_TONE).map(([key, tone]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-main">
              <span className="w-2 h-2 rounded-full" style={{ background: tone.hex }} />
              {key}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-[10px] text-main">
            <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100" /> Depot
          </span>
        </div>
      </div>

      {/* Scale / status strip */}
      <div className="absolute bottom-3 right-3 z-50 glass rounded-xl px-3 py-1.5 card-shadow flex items-center gap-2">
        <RouteIcon size={11} className="text-primary" />
        <span className="text-[10px] text-muted-foreground">
          {visible.length} of {stops.length} stops · zoom {zoom.toFixed(1)}×
        </span>
      </div>
    </div>
  );
}

function MapBase({ toPath }: { toPath: (points: LatLng[], close?: boolean) => string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="map-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M 4 0 L 0 0 0 4" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.12" />
        </pattern>
        <linearGradient id="map-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="[stop-color:#EEF2F6] dark:[stop-color:#030F22]" />
          <stop offset="100%" className="[stop-color:#DCE3EB] dark:[stop-color:#06182F]" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill="url(#map-land)" />
      <rect width="100" height="100" fill="url(#map-grid)" />

      {/* Water */}
      {LAKES.map((lake) => (
        <path
          key={lake.id}
          d={toPath(lake.points, true)}
          className="fill-sky-200/70 dark:fill-sky-900/50"
        />
      ))}
      {RIVERS.map((river) => (
        <path
          key={river.id}
          d={toPath(river.points)}
          fill="none"
          className="stroke-sky-200 dark:stroke-sky-900/70"
          strokeWidth={river.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: river.width * 3.2 }}
        />
      ))}

      {/* Roads: casing then fill, the way real map styles do it */}
      {HIGHWAYS.map((road) => (
        <g key={road.id}>
          <path
            d={toPath(road.points)}
            fill="none"
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: road.width * 3.4 }}
          />
          <path
            d={toPath(road.points)}
            fill="none"
            className="stroke-white dark:stroke-slate-800"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: road.width * 2.2 }}
          />
        </g>
      ))}
      {STREETS.map((road) => (
        <path
          key={road.id}
          d={toPath(road.points)}
          fill="none"
          className="stroke-white/90 dark:stroke-slate-800/90"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: road.width * 2 }}
        />
      ))}

    </svg>
  );
}

/**
 * District names live in HTML rather than in the SVG: the base layer is drawn
 * with `preserveAspectRatio="none"`, which would stretch SVG text along with
 * the geography.
 */
function AreaLabels({ bounds, counterScale }: { bounds: Bounds; counterScale: number }) {
  return (
    <>
      {AREA_LABELS.map((area) => {
        const { x, y } = project(area, bounds);
        if (x < 3 || x > 97 || y < 3 || y > 97) return null;
        return (
          <span
            key={area.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[9px] font-semibold tracking-[0.14em] text-slate-400/90 dark:text-slate-500 pointer-events-none select-none whitespace-nowrap"
            style={{ left: `${x}%`, top: `${y}%`, scale: counterScale, zIndex: 5 }}
          >
            {area.label}
          </span>
        );
      })}
    </>
  );
}

function MarkerPopup({
  stop,
  bounds,
  counterScale,
  onOpen,
  onAssign,
}: {
  stop: StopView;
  bounds: Bounds;
  counterScale: number;
  onOpen?: (stop: StopView) => void;
  onAssign?: (stop: StopView) => void;
}) {
  const { x, y } = project(stop.customer, bounds);
  // Flip the card toward the middle of the canvas when it would clip an edge.
  const flipX = x > 66 ? -1 : x < 34 ? 1 : 0;
  const below = y < 34;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: below ? -6 : 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: below ? -6 : 6 }}
      transition={{ duration: 0.22, ease: EASE }}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        scale: counterScale,
        transform: `translate(${flipX === -1 ? '-92%' : flipX === 1 ? '-8%' : '-50%'}, ${
          below ? '18px' : 'calc(-100% - 40px)'
        })`,
        transformOrigin: below ? 'top center' : 'bottom center',
      }}
    >
      <StopPopupCard stop={stop} onOpen={onOpen} onAssign={onAssign} />
    </motion.div>
  );
}

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl card-shadow overflow-hidden flex flex-col">{children}</div>
  );
}

function ControlButton({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-8 h-8 flex items-center justify-center transition-colors duration-200 ${
        active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  );
}
