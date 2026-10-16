'use client';

import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { CreditBadge, LiveDot, MetaChip, PriorityBadge, StatusBadge, TierBadge } from './status-badge';
import { RepAvatar } from './rep-avatar';
import { RepPicker } from './rep-picker';
import { usePlanning } from '@/features/planning/store';
import { depotsById, historyFor, repsById } from '@/features/planning/data/demo-data';
import { formatKm, formatTime, haversineKm, roadKm } from '@/features/planning/lib/geo';
import { customerTypeIcon, PRIORITY_TONE } from '@/features/planning/lib/tokens';
import { EASE } from '@/lib/utilities/motion';
import type { StopView } from '@/features/planning/types';
import { motion } from 'framer-motion';
import {
  Banknote,
  Building2,
  Camera,
  CalendarClock,
  ClipboardList,
  Clock,
  CreditCard,
  History,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShoppingCart,
  Trash2,
  User,
  UserPlus,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const HISTORY_ICON = {
  visit: MapPin,
  order: ShoppingCart,
  payment: Banknote,
  note: ClipboardList,
} as const;

export function StopDetailDrawer() {
  const {
    selectedStop,
    selectStop,
    stopViews,
    assignStop,
    unassignStop,
    selectRep,
  } = usePlanning();
  const [pickerOpen, setPickerOpen] = useState(false);

  const stop = selectedStop;
  const customer = stop?.customer;
  const rep = stop?.repId ? repsById[stop.repId] : null;
  const depot = stop ? depotsById[stop.depotId] : null;
  const tone = stop ? PRIORITY_TONE[stop.priority] : null;

  const nearby = useMemo(() => {
    if (!stop) return [];
    return stopViews
      .filter((s) => s.id !== stop.id)
      .map((s) => ({ stop: s, km: haversineKm(stop.customer, s.customer) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [stop, stopViews]);

  const history = useMemo(() => (customer ? historyFor(customer.id) : []), [customer]);

  const close = () => {
    selectStop(null);
    setPickerOpen(false);
  };

  // Rendered permanently by the layout; the panel simply stays closed until a
  // stop is selected, which keeps the exit animation available.
  if (!stop || !customer) {
    return (
      <DrawerPanel open={false} onClose={close} title="">
        {null}
      </DrawerPanel>
    );
  }

  const TypeIcon = customerTypeIcon(customer.type);
  const creditUsed = customer.creditLimit
    ? Math.round((customer.outstanding / customer.creditLimit) * 100)
    : 0;

  return (
    <DrawerPanel
      open
      onClose={close}
      title={customer.name}
      subtitle={`${customer.code} · ${customer.type}`}
      icon={TypeIcon}
      accent={tone?.hex}
      footer={
        <div className="space-y-2">
          {pickerOpen && (
            <RepPicker
              onPick={(picked) => {
                assignStop(stop.id, picked.id);
                selectRep(picked.id);
                setPickerOpen(false);
                toast.success(`Assigned to ${picked.name}`, {
                  description: `${customer.name} added to ${picked.employeeId}'s route.`,
                });
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex-1 h-10 rounded-xl gradient-primary text-white text-[12.5px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
            >
              <UserPlus size={14} /> {rep ? 'Reassign sales rep' : 'Assign sales rep'}
            </button>
            {rep && (
              <button
                onClick={() => {
                  unassignStop(stop.id);
                  toast.info('Stop returned to the queue', { description: customer.name });
                }}
                className="h-10 px-3.5 rounded-xl border border-surface text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-[0.98]"
                aria-label="Remove assignment"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={stop.status} />
        <PriorityBadge priority={stop.priority} />
        <TierBadge tier={customer.tier} />
        <MetaChip label={customer.salesOrg} icon={Building2} />
        <MetaChip label={customer.division} />
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Clock} label="Planned" value={formatTime(stop.plannedStart)} />
        <Stat icon={Navigation} label="Distance" value={formatKm(stop.distanceKm)} />
        <Stat icon={CalendarClock} label="On site" value={`${stop.estimatedMinutes}m`} />
      </div>

      {/* Assigned rep */}
      <DrawerSection title="Assigned sales rep">
        {rep ? (
          <button
            onClick={() => selectRep(rep.id)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-surface hover:bg-accent/40 transition-colors text-left"
          >
            <RepAvatar rep={rep} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-main truncate">{rep.name}</p>
              <p className="text-[10.5px] text-muted-foreground truncate">
                {rep.employeeId} · {rep.team} · {rep.province}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10.5px] text-muted-foreground">Stop</p>
              <p className="text-[13px] font-bold text-main tabular-nums">#{stop.seq}</p>
            </div>
          </button>
        ) : (
          <div className="p-3 rounded-2xl border border-dashed border-surface text-center">
            <p className="text-[12px] text-muted-foreground">Not assigned yet</p>
            <p className="text-[10.5px] text-muted-foreground/70 mt-0.5">
              Drag this stop onto a rep, or use the button below
            </p>
          </div>
        )}
      </DrawerSection>

      {/* Customer profile */}
      <DrawerSection title="Customer profile">
        <div className="rounded-2xl border border-surface px-3">
          <FieldRow label="Contact person" value={customer.contactPerson} icon={User} />
          <FieldRow
            label="Phone"
            value={<a href={`tel:${customer.phone}`} className="text-primary">{customer.phone}</a>}
            icon={Phone}
          />
          <FieldRow label="Address" value={customer.address} icon={MapPin} />
          <FieldRow label="Working hours" value={customer.workingHours} icon={Clock} />
          <FieldRow label="Depot" value={depot?.name ?? '—'} icon={Warehouse} />
          <FieldRow
            label="Depot distance"
            value={depot ? formatKm(roadKm(depot, customer)) : '—'}
            icon={Navigation}
          />
        </div>
      </DrawerSection>

      {/* Commercial */}
      <DrawerSection title="Commercial standing">
        <div className="rounded-2xl border border-surface p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
              <CreditCard size={13} /> Credit status
            </span>
            <CreditBadge status={customer.creditStatus} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold text-main tabular-nums">
                ${customer.outstanding.toLocaleString()} / ${customer.creditLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/70 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: creditUsed > 80 ? '#C33A50' : creditUsed > 55 ? '#D47C17' : '#2C9942' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, creditUsed)}%` }}
                transition={{ duration: 0.7, ease: EASE }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat icon={Package} label="Open orders" value={String(customer.outstandingOrders)} />
            <Stat icon={History} label="Visits" value={String(customer.totalVisits)} />
            <Stat
              icon={Banknote}
              label="Lifetime"
              value={`$${(customer.lifetimeValue / 1000).toFixed(0)}k`}
            />
          </div>
        </div>
      </DrawerSection>

      {/* Visit brief */}
      <DrawerSection title="Visit brief">
        <div className="rounded-2xl border border-surface p-3 space-y-2">
          <p className="text-[12px] font-medium text-main">{stop.visitReason}</p>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">{stop.notes}</p>
          <div className="flex items-center gap-2 pt-1 text-[10.5px] text-muted-foreground">
            <CalendarClock size={12} />
            Last visit {customer.lastVisit ?? 'never'}
            {stop.orderValue > 0 && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>Expected order ${stop.orderValue.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </DrawerSection>

      {/* Photos */}
      <DrawerSection title={`Site photos (${stop.photos})`}>
        {stop.photos > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: stop.photos }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
                className="aspect-square rounded-xl border border-surface flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${(i * 47 + 200) % 360}, 60%, 88%) 0%, hsl(${
                    (i * 47 + 230) % 360
                  }, 60%, 78%) 100%)`,
                }}
              >
                <ImageIcon size={15} className="text-white/90" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-2xl border border-dashed border-surface">
            <Camera size={14} className="text-muted-foreground" />
            <span className="text-[11.5px] text-muted-foreground">No photos captured yet</span>
          </div>
        )}
      </DrawerSection>

      {/* History */}
      <DrawerSection title="History timeline">
        <ol className="relative">
          {history.map((event, i) => {
            const Icon = HISTORY_ICON[event.kind];
            return (
              <motion.li
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-xl bg-muted/70 flex items-center justify-center">
                    <Icon size={12} className="text-muted-foreground" />
                  </div>
                  {i < history.length - 1 && <div className="w-px flex-1 min-h-[12px] bg-border" />}
                </div>
                <div className="pb-3.5 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{event.date}</p>
                  <p className="text-[12px] font-medium text-main">{event.label}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">{event.detail}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </DrawerSection>

      {/* Nearby */}
      <DrawerSection title="Nearby stops">
        <div className="space-y-1.5">
          {nearby.map(({ stop: near, km }) => (
            <button
              key={near.id}
              onClick={() => selectStop(near.id)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-surface hover:bg-accent/40 transition-colors text-left"
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${PRIORITY_TONE[near.priority].hex}1A` }}
              >
                <MapPin size={12} style={{ color: PRIORITY_TONE[near.priority].hex }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium text-main truncate">
                  {near.customer.name}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {near.customer.district} · {near.status}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                {formatKm(km)}
              </span>
            </button>
          ))}
        </div>
      </DrawerSection>

      {stop.status === 'In Progress' && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <LiveDot color="#D47C17" />
          <span className="text-[11.5px] font-medium text-amber-700 dark:text-amber-400">
            Visit in progress — rep checked in on site
          </span>
        </div>
      )}
    </DrawerPanel>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mb-1">
        <Icon size={10} /> {label}
      </p>
      <p className="text-[12.5px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
