'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Plus,
  Filter,
  Check,
  ThumbsUp,
  ThumbsDown,
  Hash,
  User,
  Send,
  ShieldCheck,
  CalendarDays,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  TrendingUp,
  Wallet,
  ShoppingCart,
  FileText,
  Activity,
  DollarSign,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  AWAITING_DECISION,
  depotsRepository,
  repById,
  DepotDocuments,
  DepotQuotations,
  SapSyncPanel,
  type Depot,
  type DepotLifecycle,
} from '@/features/depots';
import { ConfirmDialog, Modal } from '@/components/feedback/feedback';
import { useAuth } from '@/lib/auth/auth-context';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { toast } from 'sonner';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { ErrorState } from '@/components/feedback/feedback';
import { LevelBadge, depotJourney, requiredApproval } from '@/features/approvals';
import { isEnabled } from '@/config/features';

/** A card list, so a page is what fits in two or three screens of scrolling. */
const PAGE_SIZE = 24;

/**
 * The filters offered, and the route each one reads.
 *
 * "Awaiting approval" is three states, not one: a registration walks PendingApproval →
 * RegionManagerApproved → SalesManagerApproved → Active, and a depot parked at the
 * second is every bit as unapproved as one at the first. Filtering on the first alone
 * would show a third of the queue and call it the queue.
 */
const STATUS_FILTERS: { key: string; label: string; lifecycle?: DepotLifecycle; lifecycles?: readonly DepotLifecycle[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting approval', lifecycles: AWAITING_DECISION },
  { key: 'active', label: 'Active', lifecycle: 'Active' },
  { key: 'rejected', label: 'Rejected', lifecycle: 'Rejected' },
  { key: 'suspended', label: 'Suspended', lifecycle: 'Suspended' },
  { key: 'draft', label: 'Draft', lifecycle: 'Draft' },
];

/** Colour by what the state means, not by where it sits in the enum. */
const LIFECYCLE_TONE: Record<string, string> = {
  Draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  PendingApproval: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  RegionManagerApproved: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  SalesManagerApproved: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  Active: 'bg-green-500/10 text-green-700 border-green-500/20',
  Suspended: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  Rejected: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  Closed: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

/** The enum name is not a label. */
const LIFECYCLE_LABEL: Record<string, string> = {
  PendingApproval: 'Awaiting approval',
  RegionManagerApproved: 'Region approved',
  SalesManagerApproved: 'Sales approved',
};

function lifecycleLabel(value?: string): string {
  if (!value) return 'Unknown';
  return LIFECYCLE_LABEL[value] ?? value;
}

/** Stable empty page, so an unresolved query does not remount the list each render. */
const NO_DEPOTS: Depot[] = [];

/** Initials for the avatar tile, from whatever the record is actually called. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


/**
 * There is no orders API on this platform — no controller, no endpoint. An "Orders"
 * tab could only ever show invented numbers, so it is Quotations, which is real and
 * filterable by customer.
 */
const tabs = ['Overview', 'Sales', 'Quotations', 'Documents', 'Address & location'];

export default function DepotsPage() {
  const router = useRouter();
  const [confirmSuspend, setConfirmSuspend] = useState<Depot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [search, setSearch] = useState('');

  const [pageNumber, setPageNumber] = useState(1);
  const [statusKey, setStatusKey] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Depot | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const { can } = useAuth();
  // One authority for both answers. Gating reject on `approvals.region` — the field
  // chain's permission — left five of the seven approver roles able to say yes and
  // unable to say no, which is a worse queue than none.
  // Hidden, not removed: depot decisions are switched off with the Approval module.
  // Flip `approvalModule` back on and the buttons return.
  const mayDecide = isEnabled('approvalModule') && can('customers.approve');

  const activeFilter = STATUS_FILTERS.find((f) => f.key === statusKey) ?? STATUS_FILTERS[0];

  // Typing must not re-query the master on every keystroke.
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Memoized: `useRepositoryQuery` keys off this function's identity, so an inline
  // arrow would refetch on every render.
  const loadDepots = useCallback(
    (signal: AbortSignal) =>
      depotsRepository.list(
        {
          page: pageNumber,
          pageSize: PAGE_SIZE,
          search: appliedSearch || undefined,
          lifecycle: activeFilter.lifecycle,
          lifecycles: activeFilter.lifecycles,
        },
        signal
      ),
    [pageNumber, appliedSearch, activeFilter.lifecycle, activeFilter.lifecycles]
  );
  const { data: page, error, isLoading, refetch } = useRepositoryQuery(
    ['depots', 'all', pageNumber, appliedSearch, statusKey],
    loadDepots
  );

  // Approve advances one stage; only the last makes a depot Active, so the row stays
  // in the queue until the chain finishes. Refetching is what shows that.
  const runAction = async (label: string, action: () => Promise<void>, done: string) => {
    setActing(label);
    try {
      await action();
      toast.success(done);
      refetch();
      refetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That action failed.');
    } finally {
      setActing(null);
    }
  };

  // Searching and paging are the repository's job. Doing either here would filter one
  // page of the master and quietly present it as the whole answer — which is exactly
  // how a list that looks complete stops being complete.
  const filtered = page?.items ?? NO_DEPOTS;
  const total = page?.total ?? filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selection by identity: the list reloads, so an index can outlive its row.
  const selectedRow = filtered.find((depot) => depot.id === selectedId) ?? filtered[0] ?? null;

  // The detail record adds what the list row does not carry — the document checklist.
  const selectedRowId = selectedRow?.id;
  const loadDetail = useCallback(
    (signal: AbortSignal) =>
      selectedRowId ? depotsRepository.getById(selectedRowId, signal) : Promise.resolve(null),
    [selectedRowId]
  );
  const { data: detail, refetch: refetchDetail } = useRepositoryQuery(
    ['depot', selectedRowId ?? 'none'],
    loadDetail,
    Boolean(selectedRowId)
  );

  // Row first so the panel paints immediately. The row wins over the detail: after an
  // approval the list re-reads first, and a detail still in flight must not undo it.
  const selectedDepot = selectedRow
    ? { ...(detail && detail.id === selectedRow.id ? detail : {}), ...selectedRow }
    : null;

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search depots..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-gray-100 card-shadow text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
          />
        </div>
        {/* Status filter, beside Add Depot. A popover rather than a row of chips: six
            states would push the search box off a laptop screen. */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl">
              <Filter size={15} className="mr-1.5" />
              {activeFilter.key === 'all' ? 'Filter' : activeFilter.label}
              {activeFilter.key !== 'all' && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                  1
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 rounded-card p-1.5">
            <p className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-label text-muted-foreground">
              Status
            </p>
            <div role="radiogroup" aria-label="Filter depots by status">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={statusKey === option.key}
                  onClick={() => {
                    setStatusKey(option.key);
                    setPageNumber(1);
                    setFilterOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                    statusKey === option.key
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  {option.label}
                  {statusKey === option.key && <Check size={14} />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          className="rounded-xl gradient-primary text-white border-0"
          onClick={() => router.push('/depots/new')}
        >
          <Plus size={15} className="mr-1.5" /> Add Depot
        </Button>
      </div>

      {/* A refusal needs a reason the representative can act on, so this is a Modal
          rather than a ConfirmDialog — the latter has no room for input. The API
          requires 3–512 characters; asking here beats a 400 after the click. */}
      <Modal
        open={rejecting !== null}
        title={`Reject ${rejecting?.name ?? 'this depot'}?`}
        subtitle="The reason is stored on the record and is what the representative who captured this shop will see."
        icon={ThumbsDown}
        onClose={() => setRejecting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="rounded-md" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-md bg-rose-600 text-white hover:bg-rose-700 border-0"
              disabled={rejectReason.trim().length < 3}
              onClick={() => {
                const target = rejecting;
                const reason = rejectReason.trim();
                setRejecting(null);
                if (!target) return;
                void runAction(
                  `reject:${target.id}`,
                  () => depotsRepository.reject(target.id, reason),
                  `${target.name} rejected.`
                );
              }}
            >
              Reject registration
            </Button>
          </div>
        }
      >
        <label className="block text-[12px] font-medium text-foreground" htmlFor="reject-reason">
          Reason — say what needs fixing
        </label>
        <textarea
          id="reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={512}
          rows={3}
          placeholder="e.g. Shopfront photograph is unreadable — please recapture"
          className="w-full rounded-md border border-border bg-background p-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <p className="text-[11px] text-muted-foreground">{rejectReason.trim().length}/512 · at least 3 characters</p>
      </Modal>

      {/* SAP lives above the list: it is about the whole master, not a selected row.
          Renders nothing for a user without `customers.sync`. */}
      <SapSyncPanel onSynced={() => { refetch(); refetchDetail(); }} />

      <ConfirmDialog
        open={confirmSuspend !== null}
        title={`Suspend ${confirmSuspend?.name ?? 'this depot'}?`}
        body="A suspended depot cannot be quoted or take orders until it is reinstated."
        confirmLabel="Suspend"
        icon={PauseCircle}
        onCancel={() => setConfirmSuspend(null)}
        onConfirm={() => {
          const target = confirmSuspend;
          setConfirmSuspend(null);
          if (!target) return;
          void runAction(`suspend:${target.id}`, () => depotsRepository.suspend(target.id, 'Suspended from the depot directory.'), `${target.name} suspended.`);
        }}
      />

      {error ? (
        <ErrorState
          title="Could not load depots"
          body="The depot list is unavailable. Check your connection and try again."
          onRetry={refetch}
        />
      ) : null}

      {!error && isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[86px] rounded-card" />
            ))}
          </div>
          <div className="lg:col-span-2 skeleton h-[420px] rounded-card" />
        </div>
      )}

      {!error && !isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* The true size of the master, not the size of this page. A list that shows
              50 and says nothing about the other 5,985 reads as complete. */}
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{' '}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> depots
            {appliedSearch ? ` matching “${appliedSearch}”` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-md"
              disabled={pageNumber <= 1 || isLoading}
              onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
            >
              Previous
            </Button>
            <span className="text-[12px] text-muted-foreground">
              Page {pageNumber} of {lastPage.toLocaleString()}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-md"
              disabled={pageNumber >= lastPage || isLoading}
              onClick={() => setPageNumber((n) => n + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {!error && !isLoading && filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-surface py-12 text-center">
          <p className="text-[13px] font-semibold text-main">No depots found</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {search ? 'Nothing matches that search.' : 'No depots have been registered yet.'}
          </p>
        </div>
      )}

      {!error && !isLoading && filtered.length > 0 && selectedDepot && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Depot List */}
        <div className="space-y-3">
          {filtered.map((c, i) => (
            <Card
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0 ${selectedDepot?.id === c.id ? 'ring-2 ring-blue-200' : ''}`}
              style={{ borderRadius: '16px', animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white text-[13px] font-700" style={{ fontWeight: 700 }}>{initialsOf(c.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>{c.name}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {c.province || c.district || '—'} · {c.code}
                  </p>
                </div>
                {/* Every card says where it is in the lifecycle. Without it a queue and
                    a directory look identical. */}
                <span
                  className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    LIFECYCLE_TONE[c.lifecycle ?? ''] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                  }`}
                >
                  {lifecycleLabel(c.lifecycle)}
                </span>
              </div>
              <ApproverLine depot={c} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400">Outstanding</p>
                  <p className={`text-[12px] font-700 ${c.outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`} style={{ fontWeight: 700 }}>
                    ${c.outstanding.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Lifetime Revenue</p>
                  <p className="text-[12px] font-700 text-gray-900" style={{ fontWeight: 700 }}>${(c.lifetimeValue / 1000000).toFixed(1)}M</p>
                </div>
              </div>

              {/* Only on a depot somebody is actually waiting on, and only for a user
                  who may act. Rendering disabled buttons for everyone else would
                  advertise an action the API would refuse. */}
              {c.lifecycle && AWAITING_DECISION.includes(c.lifecycle) && mayDecide && (
                <div
                  className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {mayDecide && (
                    <Button
                      size="sm"
                      className="h-7 flex-1 rounded-md bg-green-600 text-white hover:bg-green-700 border-0"
                      disabled={acting !== null}
                      onClick={() =>
                        runAction(`approve:${c.id}`, () => depotsRepository.approve(c.id), `${c.name} approved.`)
                      }
                    >
                      <ThumbsUp size={13} className="mr-1.5" />
                      {acting === `approve:${c.id}` ? 'Approving…' : 'Approve'}
                    </Button>
                  )}
                  {mayDecide && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 rounded-md text-rose-700 hover:bg-rose-50"
                      disabled={acting !== null}
                      onClick={() => {
                        setRejectReason('');
                        setRejecting(c);
                      }}
                    >
                      <ThumbsDown size={13} className="mr-1.5" /> Reject
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Depot Detail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Card */}
          <Card className="p-6 border-gray-100 card-shadow animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0`}>
                <span className="text-white text-xl font-700" style={{ fontWeight: 700 }}>{initialsOf(selectedDepot.name)}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-[18px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{selectedDepot.name}</h2>
                <p className="text-[12px] text-gray-400 mb-2">{selectedDepot.code}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={12} className="text-blue-500" /> {selectedDepot.phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {selectedDepot.province || selectedDepot.district || '—'}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} className="text-blue-500" /> {repById(selectedDepot.repId)?.name ?? 'Unassigned'}</span>
                </div>
              </div>
              {/* Lifecycle acts that are not approvals: sending a draft for approval, and
                  taking a trading account off and back on. */}
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    LIFECYCLE_TONE[selectedDepot.lifecycle ?? ''] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                  }`}
                >
                  {lifecycleLabel(selectedDepot.lifecycle)}
                </span>
                {(selectedDepot.lifecycle === 'Draft' || selectedDepot.lifecycle === 'Rejected') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md"
                    disabled={acting !== null}
                    onClick={() =>
                      runAction(`submit:${selectedDepot.id}`, () => depotsRepository.submit(selectedDepot.id), `${selectedDepot.name} submitted for approval.`)
                    }
                  >
                    <Send size={13} className="mr-1.5" />
                    {acting === `submit:${selectedDepot.id}` ? 'Submitting…' : 'Submit for approval'}
                  </Button>
                )}
                {mayDecide && selectedDepot.lifecycle === 'Active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md text-orange-700 hover:bg-orange-50"
                    disabled={acting !== null}
                    onClick={() => setConfirmSuspend(selectedDepot)}
                  >
                    <PauseCircle size={13} className="mr-1.5" />
                    {acting === `suspend:${selectedDepot.id}` ? 'Suspending…' : 'Suspend'}
                  </Button>
                )}
                {mayDecide && selectedDepot.lifecycle === 'Suspended' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md text-green-700 hover:bg-green-50"
                    disabled={acting !== null}
                    onClick={() =>
                      runAction(`reinstate:${selectedDepot.id}`, () => depotsRepository.reinstate(selectedDepot.id), `${selectedDepot.name} reinstated.`)
                    }
                  >
                    <PlayCircle size={13} className="mr-1.5" />
                    {acting === `reinstate:${selectedDepot.id}` ? 'Reinstating…' : 'Reinstate'}
                  </Button>
                )}
              </div>
            </div>

            {selectedDepot.lifecycle === 'Rejected' && selectedDepot.rejectionReason && (
              <p className="-mt-3 mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                Rejected: {selectedDepot.rejectionReason}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Credit Limit', value: `$${(selectedDepot.creditLimit / 1000).toFixed(0)}k`, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Outstanding', value: `$${(selectedDepot.outstanding / 1000).toFixed(0)}k`, icon: Wallet, color: selectedDepot.outstanding > 0 ? 'text-amber-600' : 'text-green-600', bg: selectedDepot.outstanding > 0 ? 'bg-amber-50' : 'bg-green-50' },
                { label: 'Lifetime Revenue', value: `$${(selectedDepot.lifetimeValue / 1000000).toFixed(1)}M`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-2xl bg-gray-50/50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg} mb-2`}>
                    <s.icon size={15} className={s.color} />
                  </div>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                  <p className="text-[15px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabs */}
          <Card className="border-gray-100 card-shadow animate-fade-in-up opacity-0 overflow-hidden" style={{ borderRadius: '18px', animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-50 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-2.5 rounded-t-xl text-[12px] font-600 whitespace-nowrap transition-all duration-200 relative
                    ${activeTab === tab ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                  `}
                  style={{ fontWeight: 600 }}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-5">
              {/* Identity, as the record holds it. `—` means the field is empty on
                  this depot, not that the screen could not find it. */}
              {activeTab === 'Overview' && (
                <dl className="animate-fade-in">
                  {[
                    { label: 'SAP ID', value: selectedDepot.sap?.customerNumber || 'Not yet issued', icon: Hash },
                    { label: 'Outlet type', value: selectedDepot.type || '—', icon: Building2 },
                    { label: 'Contact person', value: selectedDepot.contactPerson || '—', icon: User },
                    { label: 'Phone number', value: selectedDepot.phone || '—', icon: Phone, href: selectedDepot.phone ? `tel:${selectedDepot.phone}` : undefined },
                    { label: 'Telegram', value: selectedDepot.telegram || '—', icon: Send, href: selectedDepot.telegram ? `https://t.me/${selectedDepot.telegram.replace(/^@/, '')}` : undefined },
                    { label: 'Email', value: selectedDepot.email || '—', icon: Activity, href: selectedDepot.email ? `mailto:${selectedDepot.email}` : undefined },
                    { label: 'Address', value: selectedDepot.address || '—', icon: MapPin },
                    {
                      label: 'Coordinates',
                      value:
                        selectedDepot.latitude != null && selectedDepot.longitude != null
                          ? `${selectedDepot.latitude.toFixed(4)}, ${selectedDepot.longitude.toFixed(4)}`
                          : 'Not captured',
                      icon: MapPin,
                      href:
                        selectedDepot.latitude != null && selectedDepot.longitude != null
                          ? `https://www.google.com/maps?q=${selectedDepot.latitude},${selectedDepot.longitude}`
                          : undefined,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-50 py-2.5 last:border-0">
                      <dt className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
                        <item.icon size={14} className="text-gray-400" /> {item.label}
                      </dt>
                      <dd className="min-w-0 truncate text-right text-[13px] font-bold text-gray-900">
                        {item.href ? (
                          <a href={item.href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {item.value}
                          </a>
                        ) : (
                          item.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Was "Payments". Commercial terms live on the record; anything that
                  needs order history does not, and is labelled rather than faked. */}
              {activeTab === 'Sales' && (
                <dl className="animate-fade-in">
                  {[
                    { label: 'Payment status', value: selectedDepot.canTrade ? 'Good standing' : lifecycleLabel(selectedDepot.lifecycle), icon: ShieldCheck },
                    { label: 'Credit limit', value: selectedDepot.creditLimit ? formatCurrency(selectedDepot.creditLimit) : '—', icon: CreditCard },
                    { label: 'Payment term', value: selectedDepot.creditTermDays ? `${selectedDepot.creditTermDays} days net` : selectedDepot.paymentTerms || '—', icon: CalendarDays },
                    { label: 'Assigned rep', value: repById(selectedDepot.repId)?.name ?? 'Unassigned', icon: User },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-50 py-2.5 last:border-0">
                      <dt className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
                        <item.icon size={14} className="text-gray-400" /> {item.label}
                      </dt>
                      <dd className="text-[13px] font-bold text-gray-900">{item.value}</dd>
                    </div>
                  ))}
                  <p className="pt-3 text-[11px] leading-relaxed text-gray-400">
                    Average revenue per order and last order date need order history,
                    which this platform has no endpoint for yet. They are left out rather
                    than estimated.
                  </p>
                </dl>
              )}

              {activeTab === 'Quotations' && <DepotQuotations depotId={selectedDepot.id} />}

              {activeTab === 'Documents' && <DepotDocuments depotId={selectedDepot.id} onChanged={refetchDetail} />}

              {activeTab === 'Address & location' && (
                <div className="animate-fade-in space-y-3">
                  <dl>
                    {[
                      { label: 'Address line 1', value: selectedDepot.addressLine1 || selectedDepot.address || '—' },
                      { label: 'Address line 2', value: selectedDepot.addressLine2 || '—' },
                      { label: 'District', value: selectedDepot.district || '—' },
                      { label: 'Province', value: selectedDepot.province || '—' },
                      { label: 'Postal code', value: selectedDepot.postalCode || '—' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-50 py-2.5 last:border-0">
                        <dt className="text-[12px] font-medium text-gray-500">{item.label}</dt>
                        <dd className="min-w-0 truncate text-right text-[13px] font-bold text-gray-900">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selectedDepot.latitude != null && selectedDepot.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${selectedDepot.latitude},${selectedDepot.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-[12.5px] font-medium text-blue-600 hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={14} /> {selectedDepot.latitude.toFixed(4)}, {selectedDepot.longitude.toFixed(4)}
                      </span>
                      <span className="text-[11px] text-gray-400">Open in Maps</span>
                    </a>
                  ) : (
                    <p className="rounded-xl bg-gray-50 p-3 text-[12.5px] text-gray-400">
                      No coordinates captured — the representative registered this depot
                      without a location fix.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}

function CheckCircle2Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

/**
 * On a depot that is waiting for a decision: who gives the final approval, from the
 * credit policy matrix. Shown only when the list row carries the credit terms — the
 * list projection often does not, and "unknown" on every card would be noise.
 */
function ApproverLine({ depot }: { depot: { lifecycle?: string; creditLimit?: number; creditTermDays?: number | null } }) {
  if (!depot.lifecycle || !(AWAITING_DECISION as readonly string[]).includes(depot.lifecycle)) return null;
  const required = requiredApproval(depot.creditLimit || null, depot.creditTermDays ?? null);
  if (required.kind === 'missing') return null;
  const journey = depotJourney(depot.lifecycle, required);
  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
      <span className="truncate text-[11px] text-muted-foreground">{journey.now.label}</span>
      <LevelBadge required={required} size="sm" />
    </div>
  );
}
