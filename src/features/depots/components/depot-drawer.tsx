'use client';

import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { MetaPill, ProgressBar, StatusPill, type Tone } from '@/components/shared/status-pill';
import { ActionButton } from '@/components/layout/page-header';
import { RepAvatar } from '@/features/planning/components/rep-avatar';
import { historyFor, repById, type CrmDepot, type DepotStatus } from '@/features/depots/data/crm';
import { QUOTATION_STATUS_LABEL, quotationTotals, quotationsService } from '@/features/depots/data/quotations';
import { quotationsStore } from '@/features/sales/store';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { formatCurrency, formatDate, relativeDays } from '@/lib/formatting';
import { motion } from 'framer-motion';
import {
  Banknote,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const STATUS_TONE: Record<DepotStatus, Tone> = {
  Active: 'positive',
  Prospect: 'info',
  'Needs Follow-up': 'warning',
  'At Risk': 'critical',
  Inactive: 'neutral',
};

const ACTIVITY_ICON = {
  Visit: MapPin,
  Call: Phone,
  Email: Mail,
  Quotation: FileText,
  Order: ShoppingCart,
  Note: ClipboardList,
} as const;

const TABS = ['Overview', 'Orders', 'Quotations', 'Activity'] as const;
type Tab = (typeof TABS)[number];

/**
 * Contextual depot record.
 *
 * A drawer rather than a route: the manager is working a list, and losing the
 * list's scroll position and filters to inspect one account is the fastest way
 * to make a workflow feel slow.
 */
export function DepotDrawer({
  depot,
  onClose,
  onAction,
  revision = 0,
}: {
  depot: CrmDepot | null;
  onClose: () => void;
  onAction?: (action: string, depot: CrmDepot) => void;
  /** Bumped by the parent after an action that changes the depot's quotations. */
  revision?: number;
}) {
  const [tab, setTab] = useState<Tab>('Overview');
  const history = useMemo(
    () => (depot ? historyFor(depot.id) : null),
    [depot]
  );

  // Quotations are the shared records the approval queue decides on, not generated
  // history, so a decision taken there shows here.
  const depotId = depot?.id;
  const loadQuotations = useCallback(
    (signal: AbortSignal) => quotationsService.list({ customerId: depotId, pageSize: 20 }, signal),
    [depotId]
  );
  const { data: quotationPage, refetch: refetchQuotations } = useRepositoryQuery(
    ['drawer-quotations', depotId ?? 'none', revision],
    loadQuotations,
    Boolean(depotId)
  );
  // The book is shared with the pipeline board and the approval queue; follow their writes.
  useEffect(() => quotationsStore.subscribe(refetchQuotations), [refetchQuotations]);
  const quotations = quotationPage?.items ?? [];

  if (!depot || !history) {
    return (
      <DrawerPanel open={false} onClose={onClose} title="">
        {null}
      </DrawerPanel>
    );
  }

  const rep = repById(depot.repId);
  const followUp = relativeDays(depot.nextFollowUp);
  const creditUsed = depot.creditLimit
    ? Math.round((depot.outstanding / depot.creditLimit) * 100)
    : 0;

  return (
    <DrawerPanel
      open
      onClose={onClose}
      title={depot.name}
      subtitle={`${depot.code} · ${depot.type}`}
      icon={Building2}
      width="w-full sm:w-[480px] lg:w-[540px]"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={FileText} onClick={() => onAction?.('quotation', depot)}>
            Create quotation
          </ActionButton>
          <ActionButton
            icon={CalendarClock}
            tone="primary"
            onClick={() => onAction?.('visit', depot)}
          >
            Schedule visit
          </ActionButton>
        </div>
      }
    >
      {/* Status strip — the answer to "what needs my attention" */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={depot.status} tone={STATUS_TONE[depot.status]} />
        <MetaPill label={depot.category} />
        <MetaPill label={depot.tier} />
        <MetaPill label={depot.province} icon={MapPin} />
      </div>

      {followUp && (
        <div
          className={`flex items-center gap-2.5 p-3 rounded-card border ${
            followUp.days < 0
              ? 'bg-rose-500/10 border-rose-500/20'
              : followUp.days <= 2
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-muted/40 border-surface'
          }`}
        >
          <CalendarClock
            size={15}
            className={
              followUp.days < 0
                ? 'text-rose-600 dark:text-rose-400'
                : followUp.days <= 2
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
            }
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-main">
              {followUp.days < 0 ? 'Follow-up overdue' : 'Next follow-up'} · {followUp.label}
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              {formatDate(depot.nextFollowUp)} · last visit {formatDate(depot.lastVisit)}
            </p>
          </div>
        </div>
      )}

      {/* Sales summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sales value" value={formatCurrency(depot.salesValue, true)} />
        <Stat label="Visits" value={String(depot.totalVisits)} />
        <Stat label="Open deals" value={String(depot.openOpportunities)} />
      </div>

      {/* Tabs keep the drawer shallow instead of one long scroll */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative flex-1 h-8 rounded-lg text-[11.5px] font-medium transition-colors ${
              tab === t ? 'text-primary' : 'text-muted-foreground hover:text-main'
            }`}
          >
            {tab === t && (
              <motion.span
                layoutId="depot-drawer-tab"
                className="absolute inset-0 rounded-lg bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <DrawerSection title="Contact information">
            <div className="rounded-card border border-surface px-3">
              <FieldRow label="Contact person" value={depot.contactPerson} icon={User} />
              <FieldRow
                label="Phone"
                value={
                  <a href={`tel:${depot.phone}`} className="text-primary">
                    {depot.phone}
                  </a>
                }
                icon={Phone}
              />
              <FieldRow
                label="Email"
                value={
                  <a href={`mailto:${depot.email}`} className="text-primary break-all">
                    {depot.email}
                  </a>
                }
                icon={Mail}
              />
              <FieldRow label="Website" value={depot.website} icon={Globe} />
              <FieldRow label="Address" value={depot.address} icon={MapPin} />
              <FieldRow label="Working hours" value={depot.workingHours} icon={Clock} />
            </div>
          </DrawerSection>

          <DrawerSection title="Business information">
            <div className="rounded-card border border-surface px-3">
              <FieldRow label="Industry" value={depot.industry} />
              <FieldRow label="Segment" value={depot.segment} />
              <FieldRow label="Registration" value={depot.registrationNo} />
              <FieldRow label="Payment terms" value={depot.paymentTerms} />
              <FieldRow label="Sales org" value={depot.salesOrg} />
              <FieldRow label="Division" value={depot.division} />
              <FieldRow label="Depot since" value={formatDate(depot.createdAt)} />
            </div>
          </DrawerSection>

          <DrawerSection title="Credit position">
            <div className="rounded-card border border-surface p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-muted-foreground">Credit status</span>
                <StatusPill
                  label={depot.creditStatus}
                  tone={
                    depot.creditStatus === 'Good Standing'
                      ? 'positive'
                      : depot.creditStatus === 'Overdue'
                        ? 'critical'
                        : 'warning'
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-semibold text-main tabular-nums">
                    {formatCurrency(depot.outstanding)} / {formatCurrency(depot.creditLimit)}
                  </span>
                </div>
                <ProgressBar
                  value={creditUsed}
                  tone={creditUsed > 80 ? 'critical' : creditUsed > 55 ? 'warning' : 'positive'}
                />
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title="Assigned sales rep">
            {rep ? (
              <div className="flex items-center gap-3 p-3 rounded-card border border-surface">
                <RepAvatar rep={rep} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-main truncate">{rep.name}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">
                    {rep.employeeId} · {rep.team} · {rep.province}
                  </p>
                </div>
                <ActionButton onClick={() => onAction?.('reassign', depot)}>
                  Reassign
                </ActionButton>
              </div>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">Not assigned</p>
            )}
          </DrawerSection>

          <DrawerSection title="Notes">
            <p className="text-[11.5px] text-muted-foreground leading-relaxed p-3 rounded-card border border-surface">
              {depot.notes}
            </p>
          </DrawerSection>
        </>
      )}

      {tab === 'Orders' && (
        <DrawerSection title={`Recent orders (${history.orders.length})`}>
          <div className="space-y-1.5">
            {history.orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 rounded-card border border-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-main">{order.reference}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">{order.items}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(order.date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-semibold text-main tabular-nums">
                    {formatCurrency(order.value)}
                  </p>
                  <div className="mt-1">
                    <StatusPill
                      size="sm"
                      label={order.status}
                      tone={
                        order.status === 'Delivered'
                          ? 'positive'
                          : order.status === 'Cancelled'
                            ? 'critical'
                            : 'info'
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}

      {tab === 'Quotations' && (
        <DrawerSection title={`Quotations (${quotations.length})`}>
          <div className="space-y-1.5">
            {quotations.length === 0 && (
              <p className="text-[11.5px] text-muted-foreground p-3 rounded-card border border-surface">
                No quotations for this depot yet.
              </p>
            )}
            {quotations.map((q) => (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-card border border-surface">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-main">{q.number}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Issued {formatDate(q.createdAt.slice(0, 10))} · valid to {formatDate(q.validTo.slice(0, 10))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-semibold text-main tabular-nums">
                    {formatCurrency(quotationTotals(q).total)}
                  </p>
                  <div className="mt-1">
                    <StatusPill
                      size="sm"
                      label={QUOTATION_STATUS_LABEL[q.status]}
                      tone={
                        q.status === 'Approved'
                          ? 'positive'
                          : q.status === 'Rejected' || q.status === 'Expired'
                            ? 'critical'
                            : q.status === 'Draft'
                              ? 'neutral'
                              : 'info'
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}

      {tab === 'Activity' && (
        <DrawerSection title="Timeline">
          <ol className="relative">
            {history.activities.map((event, i) => {
              const Icon = ACTIVITY_ICON[event.type];
              return (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-7 h-7 rounded-xl bg-muted/70 flex items-center justify-center">
                      <Icon size={12} className="text-muted-foreground" />
                    </div>
                    {i < history.activities.length - 1 && (
                      <div className="w-px flex-1 min-h-[14px] bg-border" />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{formatDate(event.date)}</p>
                    <p className="text-[12px] font-medium text-main mt-0.5">{event.title}</p>
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                      {event.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </DrawerSection>
      )}
    </DrawerPanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mb-1">
        <Banknote size={10} /> {label}
      </p>
      <p className="text-[13px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
