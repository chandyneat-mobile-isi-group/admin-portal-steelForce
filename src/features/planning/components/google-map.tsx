'use client';


import {
  DARK_MAP_STYLE,
  LIGHT_MAP_STYLE,
  depotPinIcon,
  loadGoogleMaps,
  repDotIcon,
  stopPinIcon,
} from '@/features/planning/lib/google-maps';
import { PHNOM_PENH, hasFix } from '@/features/planning/lib/geo';
import { PRIORITY_TONE, STATUS_TONE, repColor } from '@/features/planning/lib/tokens';
import type { StopView } from '@/features/planning/types';
import { StopPopupCard } from './stop-popup-card';
import type { StopMapProps } from './map-types';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, Loader2, Minus, Plus, Route as RouteIcon } from 'lucide-react';

export function GoogleStopMap({
  stops,
  depots = [],
  reps = [],
  routeStops = [],
  routeDepot = null,
  routeColor = '#004A98',
  stopIcon = 'customerType',
  selectedStopId = null,
  onSelectStop,
  onOpenStop,
  onAssignStop,
  className = 'h-[520px]',
  maxMarkers = 140,
  colorBy = 'priority',
  onLoadError,
}: StopMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const stopMarkers = useRef<Map<string, any>>(new Map());
  const depotMarkers = useRef<any[]>([]);
  const repOverlays = useRef<any[]>([]);
  const polylines = useRef<any[]>([]);
  const popupRef = useRef<any>(null);
  const popupHost = useRef<HTMLDivElement | null>(null);
  const dashTimer = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [popupMounted, setPopupMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // Unpinned records are filtered out here rather than at each draw site: a stop with
  // no fix has no position, no marker and no place in the bounds, and letting one
  // through poisons `fitBounds` for every other stop on the board.
  const visible = useMemo(
    () => stops.filter((s) => hasFix(s.customer)).slice(0, maxMarkers),
    [stops, maxMarkers]
  );
  const routeIndex = useMemo(() => {
    const m = new Map<string, number>();
    routeStops.forEach((s, i) => m.set(s.id, i + 1));
    return m;
  }, [routeStops]);

  const opened = useMemo(() => visible.find((s) => s.id === openId) ?? null, [visible, openId]);

  /** Marker appearance is derived, so cache the key and skip redundant setIcon. */
  const iconFor = useCallback(
    (stop: StopView) => {
      const seq = routeIndex.get(stop.id);
      const tone = colorBy === 'status' ? STATUS_TONE[stop.status] : PRIORITY_TONE[stop.priority];
      const color = seq ? routeColor : tone.hex;
      const selected = selectedStopId === stop.id || openId === stop.id;
      // stopIcon is part of the key: without it a marker keeps the pin it was first
      // drawn with, because setIcon is skipped whenever the key is unchanged.
      return { key: `${color}|${seq ?? ''}|${selected}|${stopIcon}`, color, seq, selected };
    },
    [routeIndex, routeColor, colorBy, selectedStopId, openId, stopIcon]
  );

  // ── Map bootstrap ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Captured now so teardown detaches the same collections this mount created,
    // not whatever a later render left on the refs.
    const markers = stopMarkers.current;
    const depotLayer = depotMarkers.current;
    const repLayer = repOverlays.current;
    const lines = polylines.current;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !hostRef.current) return;
        googleRef.current = google;
        mapRef.current = new google.maps.Map(hostRef.current, {
          center: PHNOM_PENH,
          zoom: 12,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          backgroundColor: 'transparent',
          styles: LIGHT_MAP_STYLE,
        });
        mapRef.current.addListener('click', () => setOpenId(null));

        // A single reusable overlay hosts the React popup; only its anchor moves.
        const host = document.createElement('div');
        host.style.position = 'absolute';
        host.style.transform = 'translate(-50%, calc(-100% - 46px))';
        host.style.willChange = 'transform';
        popupHost.current = host;

        class Popup extends google.maps.OverlayView {
          position: any = null;
          onAdd() {
            this.getPanes().floatPane.appendChild(host);
          }
          onRemove() {
            host.parentNode?.removeChild(host);
          }
          draw() {
            if (!this.position) return;
            const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
            if (!point) return;
            host.style.left = `${point.x}px`;
            host.style.top = `${point.y}px`;
          }
        }
        popupRef.current = new Popup();
        popupRef.current.setMap(mapRef.current);

        setReady(true);
        setPopupMounted(true);
      })
      .catch((err: Error) => {
        if (!cancelled) onLoadError?.(err);
      });

    return () => {
      cancelled = true;
      if (dashTimer.current) window.clearInterval(dashTimer.current);
      markers.forEach((m) => m.setMap(null));
      markers.clear();
      depotLayer.forEach((m) => m.setMap(null));
      repLayer.forEach((m) => m.setMap(null));
      lines.forEach((p) => p.setMap(null));
      popupRef.current?.setMap(null);
    };
    // Bootstrap runs once; every other effect reacts to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setOptions({
      styles: resolvedTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    });
  }, [ready, resolvedTheme]);

  // ── Stop markers (reconciled, not rebuilt) ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const google = googleRef.current;
    const map = mapRef.current;
    const seen = new Set<string>();

    visible.forEach((stop) => {
      seen.add(stop.id);
      const { key, color, seq, selected } = iconFor(stop);
      let marker = stopMarkers.current.get(stop.id);

      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position: { lat: stop.customer.lat, lng: stop.customer.lng },
          title: stop.customer.name,
          optimized: true,
          animation: google.maps.Animation.DROP,
        });
        marker.addListener('click', () => {
          setOpenId((prev) => (prev === stop.id ? null : stop.id));
          onSelectStop?.(stop);
        });
        stopMarkers.current.set(stop.id, marker);
      }

      if (marker.__iconKey !== key) {
        marker.setIcon({
          // A depot-shaped stop keeps its status colour, which is what separates it
          // from the depot layer's fixed navy pins.
          url: stopIcon === 'depot' ? depotPinIcon(color) : stopPinIcon(color, seq, selected),
          scaledSize:
            stopIcon === 'depot'
              ? new google.maps.Size(selected ? 38 : 34, selected ? 45 : 40)
              : new google.maps.Size(selected ? 38 : 32, selected ? 50 : 42),
          anchor: new google.maps.Point(selected ? 19 : 16, selected ? 50 : 42),
        });
        marker.__iconKey = key;
      }
      marker.setZIndex(selected ? 900 : seq ? 500 : 100);
      // Route members stay solid; everything else recedes while a route is shown.
      marker.setOpacity(routeStops.length > 0 && !seq ? 0.4 : 1);
    });

    stopMarkers.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null);
        stopMarkers.current.delete(id);
      }
    });
  }, [ready, visible, iconFor, routeStops.length, onSelectStop, stopIcon]);

  // ── Depots ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const google = googleRef.current;
    // Layers are mutated in place, never reassigned, so the unmount teardown
    // captured at bootstrap always detaches the live overlays.
    const layer = depotMarkers.current;
    layer.forEach((m) => m.setMap(null));
    layer.length = 0;
    depots.filter(hasFix).forEach((d) => {
      layer.push(
        new google.maps.Marker({
          map: mapRef.current,
          position: { lat: d.lat, lng: d.lng },
          title: `${d.name} · ${d.code}`,
          zIndex: 800,
          icon: {
            url: depotPinIcon(resolvedTheme === 'dark' ? '#F6F8FA' : '#011E41'),
            scaledSize: new google.maps.Size(34, 40),
            anchor: new google.maps.Point(17, 40),
          },
        })
      );
    });
  }, [ready, depots, resolvedTheme]);

  // ── Live rep positions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const google = googleRef.current;
    const layer = repOverlays.current;
    layer.forEach((m) => m.setMap(null));
    layer.length = 0;
    reps.filter(hasFix).forEach((rep) => {
      const color = repColor(rep.avatarHue);
      const halo = new google.maps.Circle({
        map: mapRef.current,
        center: { lat: rep.lat, lng: rep.lng },
        radius: 420,
        strokeColor: color,
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.12,
        clickable: false,
      });
      const dot = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: rep.lat, lng: rep.lng },
        title: `${rep.name} · ${rep.currentLocation}`,
        zIndex: 700,
        icon: {
          url: repDotIcon(color),
          scaledSize: new google.maps.Size(18, 18),
          anchor: new google.maps.Point(9, 9),
        },
      });
      layer.push(halo, dot);
    });
  }, [ready, reps]);

  // ── Route polyline ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const google = googleRef.current;
    const layer = polylines.current;
    if (dashTimer.current) window.clearInterval(dashTimer.current);
    layer.forEach((p) => p.setMap(null));
    layer.length = 0;

    if (routeStops.length === 0) return;

    // A stop with no fix is skipped rather than breaking the line: the leg simply runs
    // to the next stop that does have one. One NaN vertex rejects the entire path.
    const plotted = routeStops.filter((s) => hasFix(s.customer));
    const anchor = hasFix(routeDepot) ? [{ lat: routeDepot!.lat, lng: routeDepot!.lng }] : [];
    const path = [
      ...anchor,
      ...plotted.map((s) => ({ lat: s.customer.lat, lng: s.customer.lng })),
      ...anchor,
    ];

    if (path.length < 2) return;

    const base = new google.maps.Polyline({
      map: mapRef.current,
      path,
      strokeColor: routeColor,
      strokeOpacity: 0.28,
      strokeWeight: 5,
      zIndex: 40,
    });

    // Dashes drawn as repeated symbols, then marched along the path so the
    // route reads as a direction of travel rather than a static line.
    const dashed = new google.maps.Polyline({
      map: mapRef.current,
      path,
      strokeOpacity: 0,
      zIndex: 41,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeColor: routeColor,
            strokeOpacity: 1,
            strokeWeight: 3,
            scale: 3,
          },
          offset: '0',
          repeat: '18px',
        },
      ],
    });

    let offset = 0;
    dashTimer.current = window.setInterval(() => {
      offset = (offset + 1) % 100;
      const icons = dashed.get('icons');
      icons[0].offset = `${offset}%`;
      dashed.set('icons', icons);
    }, 90);

    layer.push(base, dashed);
  }, [ready, routeStops, routeDepot, routeColor]);

  // ── Viewport fit ───────────────────────────────────────────────────────────
  const fitKey = useMemo(
    () => (routeStops.length ? routeStops.map((s) => s.id).join(',') : visible.map((s) => s.id).join(',')),
    [routeStops, visible]
  );

  useEffect(() => {
    if (!ready) return;
    const google = googleRef.current;
    const points = (routeStops.length ? routeStops : visible).filter((s) => hasFix(s.customer));
    const bounds = new google.maps.LatLngBounds();
    points.forEach((s) => bounds.extend({ lat: s.customer.lat, lng: s.customer.lng }));
    if (hasFix(routeDepot)) bounds.extend({ lat: routeDepot!.lat, lng: routeDepot!.lng });
    else depots.filter(hasFix).forEach((d) => bounds.extend({ lat: d.lat, lng: d.lng }));

    // Nothing on this board carries a fix. Sitting on the default view is the honest
    // outcome — fitting an empty bounds sends the camera to NaN.
    if (bounds.isEmpty()) {
      mapRef.current.setCenter(PHNOM_PENH);
      mapRef.current.setZoom(12);
      return;
    }

    mapRef.current.fitBounds(bounds, 64);
    // Only refit when the set of plotted stops actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  // ── Popup anchor ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !popupRef.current) return;
    const google = googleRef.current;
    if (opened && hasFix(opened.customer)) {
      popupRef.current.position = new google.maps.LatLng(opened.customer.lat, opened.customer.lng);
      popupRef.current.draw();
      if (popupHost.current) popupHost.current.style.display = 'block';
    } else if (popupHost.current) {
      popupHost.current.style.display = 'none';
    }
  }, [ready, opened]);

  const zoomBy = (delta: number) => {
    if (!mapRef.current) return;
    mapRef.current.setZoom((mapRef.current.getZoom() ?? 12) + delta);
  };

  const refit = () => {
    if (!ready) return;
    const google = googleRef.current;
    const points = (routeStops.length ? routeStops : visible).filter((s) => hasFix(s.customer));
    if (points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((s) => bounds.extend({ lat: s.customer.lat, lng: s.customer.lng }));
    mapRef.current.fitBounds(bounds, 64);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-card border border-surface card-shadow bg-card-surface ${className}`}
    >
      <div ref={hostRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground bg-card-surface">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[12px]">Loading live map…</span>
        </div>
      )}

      {popupMounted && popupHost.current && opened
        ? createPortal(
            <StopPopupCard stop={opened} onOpen={onOpenStop} onAssign={onAssignStop} />,
            popupHost.current
          )
        : null}

      {/* Controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        <div className="glass rounded-xl card-shadow overflow-hidden flex flex-col">
          <MapButton label="Zoom in" onClick={() => zoomBy(1)}>
            <Plus size={14} />
          </MapButton>
          <div className="h-px bg-border" />
          <MapButton label="Zoom out" onClick={() => zoomBy(-1)}>
            <Minus size={14} />
          </MapButton>
          <div className="h-px bg-border" />
          <MapButton label="Fit to stops" onClick={refit}>
            <Crosshair size={14} />
          </MapButton>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-30 glass rounded-xl px-3 py-2.5 card-shadow">
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

      <div className="absolute bottom-3 right-3 z-30 glass rounded-xl px-3 py-1.5 card-shadow flex items-center gap-2">
        <RouteIcon size={11} className="text-primary" />
        <span className="text-[10px] text-muted-foreground">
          {visible.length} of {stops.length} stops plotted
        </span>
      </div>
    </div>
  );
}

function MapButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors duration-200"
    >
      {children}
    </button>
  );
}
