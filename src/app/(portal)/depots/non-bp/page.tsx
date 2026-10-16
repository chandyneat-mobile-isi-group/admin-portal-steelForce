'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  TrendingUp,
  Wallet,
  User,
  Mail,
  Store,
  Package,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MY_REP_IDS, nonBpDepotsRepository, repById, type NonBpDepot } from '@/features/depots';
import { CUSTOMER_TYPES, PROVINCES, districtsByProvince } from '@/features/planning';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { ErrorState, Modal } from '@/components/feedback/feedback';
import { SelectField, TextArea, TextField } from '@/components/forms/form';
import { formatDate } from '@/lib/formatting';

/** A card list, so a page is what fits in two or three screens of scrolling. */
const PAGE_SIZE = 12;

const STATUS_TONE: Record<NonBpDepot['status'], string> = {
  Pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  Approved: 'bg-green-500/10 text-green-700 border-green-500/20',
  Rejected: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  Converted: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
};

interface CaptureForm {
  name: string;
  contactPerson: string;
  phone: string;
  province: string;
  district: string;
  addressLine1: string;
  outletType: string;
  targetProduct: string;
  estimatedPotential: string;
  description: string;
}

const EMPTY_CAPTURE: CaptureForm = {
  name: '',
  contactPerson: '',
  phone: '',
  province: '',
  district: '',
  addressLine1: '',
  outletType: 'Hardware Shop',
  targetProduct: '',
  estimatedPotential: '',
  description: '',
};

/** Stable empty page, so an unresolved query does not remount the list each render. */
const NO_PROSPECTS: NonBpDepot[] = [];

/** Initials for the avatar tile, from whatever the record is actually called. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


/**
 * A prospect has never traded, so there are no orders, payments or quotations to show —
 * tabs for them could only ever hold invented numbers. These are what the record holds.
 */
const tabs = ['Overview', 'Location', 'Decision'];

export default function NonBpDepotsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<NonBpDepot | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [capture, setCapture] = useState<CaptureForm>(EMPTY_CAPTURE);

  // Typing must not fire a request per keystroke against the prospect queue.
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProspects = useCallback(
    (signal: AbortSignal) =>
      nonBpDepotsRepository.list(
        { page: pageNumber, pageSize: PAGE_SIZE, search: appliedSearch || undefined },
        signal
      ),
    [pageNumber, appliedSearch]
  );
  const { data: page, error, isLoading, refetch } = useRepositoryQuery(
    ['non-bp-depots', pageNumber, appliedSearch],
    loadProspects
  );

  // Searching and paging are the server's job; filtering one page here and calling it
  // the answer is how a list that looks complete stops being complete.
  const filtered = page?.items ?? NO_PROSPECTS;
  const total = page?.total ?? filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selection by identity: the list reloads, so an index can outlive its row.
  const selectedDepot = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null;

  const runAction = async (label: string, action: () => Promise<unknown>, done: string, description?: string) => {
    setActing(label);
    try {
      await action();
      toast.success(done, description ? { description } : undefined);
      refetch();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That action failed.');
      return false;
    } finally {
      setActing(null);
    }
  };

  const saveCapture = async () => {
    if (!capture.name.trim() || !capture.addressLine1.trim() || !capture.province) {
      toast.error('Shop name, province and address are required.');
      return;
    }
    const ok = await runAction(
      'capture',
      () =>
        nonBpDepotsRepository.create({
          name: capture.name.trim(),
          contactPerson: capture.contactPerson.trim() || null,
          phone: capture.phone.trim() || null,
          province: capture.province,
          district: capture.district || null,
          city: capture.district || capture.province,
          addressLine1: capture.addressLine1.trim(),
          outletType: capture.outletType,
          targetProduct: capture.targetProduct.trim() || null,
          estimatedPotential: Number(capture.estimatedPotential.replace(/[^\d.]/g, '')) || null,
          description: capture.description.trim() || null,
          createdBySalesRepId: MY_REP_IDS[0],
        }),
      'Prospect captured',
      capture.name.trim()
    );
    if (ok) {
      setCapturing(false);
      setCapture(EMPTY_CAPTURE);
      setSelectedId(null);
      setPageNumber(1);
    }
  };

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
        <Button
          size="sm"
          className="rounded-xl gradient-primary text-white border-0"
          onClick={() => {
            setCapture(EMPTY_CAPTURE);
            setCapturing(true);
          }}
        >
          <Plus size={15} className="mr-1.5" /> Add Depot
        </Button>
      </div>

      <Modal
        open={capturing}
        title="Capture a prospect"
        subtitle="A shop with no SAP business partner yet. A manager approves it before it can be registered."
        icon={Store}
        width="w-[min(680px,calc(100vw-32px))]"
        onClose={() => setCapturing(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="rounded-md" onClick={() => setCapturing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-md gradient-primary text-white border-0"
              disabled={acting === 'capture'}
              onClick={() => void saveCapture()}
            >
              {acting === 'capture' ? 'Saving…' : 'Save prospect'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Shop name" required value={capture.name} onChange={(v) => setCapture({ ...capture, name: v })} placeholder="Srey Pov Hardware" />
          <SelectField label="Outlet type" value={capture.outletType} onChange={(v) => setCapture({ ...capture, outletType: v })} options={CUSTOMER_TYPES} />
          <TextField label="Contact person" value={capture.contactPerson} onChange={(v) => setCapture({ ...capture, contactPerson: v })} placeholder="Mrs. Srey Pov" />
          <TextField label="Phone" type="tel" value={capture.phone} onChange={(v) => setCapture({ ...capture, phone: v })} placeholder="+855 12 345 678" />
          <SelectField label="Province" required value={capture.province} onChange={(v) => setCapture({ ...capture, province: v, district: '' })} options={PROVINCES} />
          <SelectField
            label="District"
            value={capture.district}
            onChange={(v) => setCapture({ ...capture, district: v })}
            options={capture.province ? districtsByProvince[capture.province] ?? [] : []}
            placeholder={capture.province ? 'Select…' : 'Choose a province first'}
          />
          <TextField label="Address" required value={capture.addressLine1} onChange={(v) => setCapture({ ...capture, addressLine1: v })} placeholder="#18, St. 598" full />
          <TextField label="Target product" value={capture.targetProduct} onChange={(v) => setCapture({ ...capture, targetProduct: v })} placeholder="Deformed bar 10–12mm" />
          <TextField label="Estimated monthly potential" prefix="$" value={capture.estimatedPotential} onChange={(v) => setCapture({ ...capture, estimatedPotential: v })} placeholder="5,000" />
          <TextArea label="Notes" value={capture.description} onChange={(v) => setCapture({ ...capture, description: v })} rows={3} />
        </div>
      </Modal>

      <Modal
        open={rejecting !== null}
        title={`Reject ${rejecting?.name ?? 'this prospect'}?`}
        subtitle="The reason stays on the record so the representative knows why."
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
                setRejecting(null);
                if (!target) return;
                void runAction(`reject:${target.id}`, () => nonBpDepotsRepository.reject(target.id, rejectReason), `${target.name} rejected.`);
              }}
            >
              Reject prospect
            </Button>
          </div>
        }
      >
        <TextArea
          label="Reason"
          value={rejectReason}
          onChange={setRejectReason}
          rows={3}
          placeholder="e.g. Inside an existing depot's delivery radius"
        />
      </Modal>

      {error ? (
        <ErrorState
          title="Could not load NON-BP depots"
          body="The prospect queue is unavailable. Check your connection and try again."
          onRetry={refetch}
        />
      ) : null}

      {!error && isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-[86px] rounded-card" />
            ))}
          </div>
          <div className="lg:col-span-2 skeleton h-[420px] rounded-card" />
        </div>
      )}

      {!error && !isLoading && filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-surface py-12 text-center">
          <p className="text-[13px] font-semibold text-main">No NON-BP depots</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {appliedSearch
              ? 'Nothing matches that search.'
              : 'Nothing is waiting. Prospects appear here once a representative captures one in the field.'}
          </p>
        </div>
      )}

      {!error && !isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{' '}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> prospects
            {appliedSearch ? ` matching “${appliedSearch}”` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-md"
              disabled={pageNumber <= 1 || isLoading}
              onClick={() => setPageNumber((n) => Math.max(1, n - 1))}>Previous</Button>
            <span className="text-[12px] text-muted-foreground">
              Page {pageNumber} of {lastPage.toLocaleString()}
            </span>
            <Button size="sm" variant="outline" className="rounded-md"
              disabled={pageNumber >= lastPage || isLoading}
              onClick={() => setPageNumber((n) => n + 1)}>Next</Button>
          </div>
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
                    <MapPin size={10} /> {c.city || c.province || '—'} · {c.code ?? 'No code'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400">Status</p>
                  <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Est. potential</p>
                  <p className="text-[12px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{c.estimatedPotential ? `$${c.estimatedPotential.toLocaleString()}` : '—'}</p>
                </div>
              </div>
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
                <p className="text-[12px] text-gray-400 mb-2">{selectedDepot.code ?? 'No SAP code — not a business partner'}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={12} className="text-blue-500" /> {selectedDepot.phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {selectedDepot.city || selectedDepot.province || '—'}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} className="text-blue-500" /> {selectedDepot.outletType ?? 'Prospect'}</span>
                </div>
              </div>
              {/* The decision this queue exists for: accept, refuse, or — once accepted —
                  convert into a depot registration that goes for credit approval. */}
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                {selectedDepot.status === 'Pending' && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 rounded-md bg-green-600 text-white hover:bg-green-700 border-0"
                      disabled={acting !== null}
                      onClick={() =>
                        void runAction(`approve:${selectedDepot.id}`, () => nonBpDepotsRepository.approve(selectedDepot.id), `${selectedDepot.name} approved.`, 'It can now be converted into a depot registration.')
                      }
                    >
                      <ThumbsUp size={13} className="mr-1.5" />
                      {acting === `approve:${selectedDepot.id}` ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-md text-rose-700 hover:bg-rose-50"
                      disabled={acting !== null}
                      onClick={() => {
                        setRejectReason('');
                        setRejecting(selectedDepot);
                      }}
                    >
                      <ThumbsDown size={13} className="mr-1.5" /> Reject
                    </Button>
                  </>
                )}
                {selectedDepot.status === 'Approved' && (
                  <Button
                    size="sm"
                    className="h-7 rounded-md gradient-primary text-white border-0"
                    disabled={acting !== null}
                    onClick={() =>
                      void runAction(
                        `convert:${selectedDepot.id}`,
                        () => nonBpDepotsRepository.convert(selectedDepot.id),
                        `${selectedDepot.name} converted.`,
                        'Registered as a depot and sent for credit approval.'
                      )
                    }
                  >
                    <ArrowRightLeft size={13} className="mr-1.5" />
                    {acting === `convert:${selectedDepot.id}` ? 'Converting…' : 'Convert to depot'}
                  </Button>
                )}
                {selectedDepot.status === 'Converted' && selectedDepot.convertedCustomerId && (
                  <Link
                    href={`/approval/depots/${selectedDepot.convertedCustomerId}`}
                    className="text-[12px] font-medium text-blue-600 hover:underline"
                  >
                    View registration →
                  </Link>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                // A prospect has never traded, so there is no ledger to show. Credit
                // limit, outstanding and lifetime revenue are all zero by definition,
                // and three zeroes read as a data fault rather than as "not a customer
                // yet". These are the facts the record actually holds.
                { label: 'Est. potential', value: selectedDepot.estimatedPotential ? `$${(selectedDepot.estimatedPotential / 1000).toFixed(0)}k` : '—', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Status', value: selectedDepot.status, icon: Wallet, color: selectedDepot.status === 'Approved' ? 'text-green-600' : selectedDepot.status === 'Rejected' ? 'text-rose-600' : 'text-amber-600', bg: selectedDepot.status === 'Approved' ? 'bg-green-50' : selectedDepot.status === 'Rejected' ? 'bg-rose-50' : 'bg-amber-50' },
                { label: 'Target product', value: selectedDepot.targetProduct ?? '—', icon: CreditCard, color: 'text-gray-700', bg: 'bg-gray-50' },
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
              {activeTab === 'Overview' && (
                <div className="space-y-4 animate-fade-in">
                  {[
                    { label: 'Contact person', value: selectedDepot.contactPerson ?? '—', icon: User, color: 'text-blue-600' },
                    { label: 'Phone', value: selectedDepot.phone ?? '—', icon: Phone, color: 'text-green-600' },
                    { label: 'Email', value: selectedDepot.email ?? '—', icon: Mail, color: 'text-sky-600' },
                    { label: 'Outlet type', value: selectedDepot.outletType ?? '—', icon: Store, color: 'text-amber-600' },
                    { label: 'Target product', value: selectedDepot.targetProduct ?? '—', icon: Package, color: 'text-purple-600' },
                    { label: 'Captured by', value: repById(selectedDepot.createdBySalesRepId)?.name ?? '—', icon: User, color: 'text-gray-600' },
                    { label: 'Captured on', value: selectedDepot.createdAt ? formatDate(selectedDepot.createdAt.slice(0, 10)) : '—', icon: CalendarDays, color: 'text-gray-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-[12px] text-gray-500 font-500 flex items-center gap-2" style={{ fontWeight: 500 }}>
                        <item.icon size={14} className={item.color} /> {item.label}
                      </span>
                      <span className="text-[13px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                  {selectedDepot.description && (
                    <p className="rounded-xl bg-gray-50 p-3 text-[12.5px] leading-relaxed text-gray-600">{selectedDepot.description}</p>
                  )}
                </div>
              )}
              {activeTab === 'Location' && (
                <div className="space-y-3 animate-fade-in">
                  {[
                    { label: 'Address', value: selectedDepot.addressLine1 || '—' },
                    { label: 'District', value: selectedDepot.district ?? '—' },
                    { label: 'City', value: selectedDepot.city || '—' },
                    { label: 'Province', value: selectedDepot.province ?? '—' },
                    { label: 'Territory', value: selectedDepot.territoryCode ?? '—' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-[12px] font-medium text-gray-500">{item.label}</span>
                      <span className="min-w-0 truncate text-right text-[13px] font-bold text-gray-900">{item.value}</span>
                    </div>
                  ))}
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
                    <p className="rounded-xl bg-gray-50 p-3 text-[12.5px] text-gray-400">No coordinates captured.</p>
                  )}
                </div>
              )}
              {activeTab === 'Decision' && (
                <div className="space-y-3 animate-fade-in">
                  {[
                    { label: 'Status', value: selectedDepot.status },
                    { label: 'Approved by', value: selectedDepot.approvedBy ?? '—' },
                    { label: 'Approved on', value: selectedDepot.approvedAt ? formatDate(selectedDepot.approvedAt.slice(0, 10)) : '—' },
                    { label: 'Rejected by', value: selectedDepot.rejectedBy ?? '—' },
                    { label: 'Rejected on', value: selectedDepot.rejectedAt ? formatDate(selectedDepot.rejectedAt.slice(0, 10)) : '—' },
                    { label: 'Converted on', value: selectedDepot.convertedAt ? formatDate(selectedDepot.convertedAt.slice(0, 10)) : '—' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-[12px] font-medium text-gray-500">{item.label}</span>
                      <span className="text-[13px] font-bold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                  {selectedDepot.rejectionReason && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-800">
                      {selectedDepot.rejectionReason}
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

