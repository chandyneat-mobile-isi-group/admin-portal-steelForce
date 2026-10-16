'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/feedback/feedback';
import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { ActionButton } from '@/components/layout/page-header';
import {
  Plus,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  User,
  Calendar,
  Percent,
  Search,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Eye,
  ArrowRightLeft,
  ShoppingCart,
  Store,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatting';
import { isoDate } from '@/lib/utilities/demo-clock';
import { saveBlob } from '@/lib/utilities/download';
import { csvBlob, fileStamp } from '@/services/mock';
import {
  LineItemsTable,
  QUOTATION_STATUSES,
  QuotationFormModal,
  quotationActions,
  useQuotations,
  type Quotation,
  type QuotationStatus,
} from '@/features/sales';

const columns: Array<{ id: QuotationStatus; title: string; color: string; icon: typeof FileText }> = [
  { id: 'Draft', title: 'Draft', color: 'bg-gray-100', icon: FileText },
  { id: 'Pending', title: 'Pending Approval', color: 'bg-amber-100', icon: Clock },
  { id: 'Approved', title: 'Approved', color: 'bg-green-100', icon: CheckCircle2 },
  { id: 'Rejected', title: 'Rejected', color: 'bg-red-100', icon: XCircle },
  { id: 'Converted', title: 'Converted', color: 'bg-blue-100', icon: Send },
];

const approvalLevels: Record<QuotationStatus, { level: string; color: string }> = {
  Draft: { level: 'Level 0', color: 'text-gray-500 bg-gray-50' },
  Pending: { level: 'Level 1', color: 'text-amber-600 bg-amber-50' },
  Approved: { level: 'Level 2', color: 'text-green-600 bg-green-50' },
  Rejected: { level: 'Declined', color: 'text-red-600 bg-red-50' },
  Converted: { level: 'Level 3', color: 'text-blue-600 bg-blue-50' },
};

const SORTS = [
  { value: 'closing', label: 'Closing soonest' },
  { value: 'newest', label: 'Newest first' },
  { value: 'amount', label: 'Highest amount' },
  { value: 'customer', label: 'Customer A–Z' },
] as const;
type SortValue = (typeof SORTS)[number]['value'];

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function QuotationsPage() {
  const router = useRouter();
  const quotations = useQuotations();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('closing');
  const [focus, setFocus] = useState<QuotationStatus | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState<Quotation | null>(null);

  const detail = detailId ? quotations.find((q) => q.id === detailId) ?? null : null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = quotations.filter((x) => !q || `${x.id} ${x.customer} ${x.createdBy}`.toLowerCase().includes(q));
    return rows.sort((a, b) =>
      sort === 'amount' ? b.amount - a.amount
      : sort === 'customer' ? a.customer.localeCompare(b.customer)
      : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
      : a.closing.localeCompare(b.closing)
    );
  }, [quotations, search, sort]);

  const byColumn = useMemo(() => {
    const map = Object.fromEntries(QUOTATION_STATUSES.map((s) => [s, [] as Quotation[]])) as Record<QuotationStatus, Quotation[]>;
    visible.forEach((q) => map[q.status].push(q));
    return map;
  }, [visible]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(QUOTATION_STATUSES.map((s) => [s, 0])) as Record<QuotationStatus, number>;
    quotations.forEach((q) => (map[q.status] += 1));
    return map;
  }, [quotations]);

  const shownColumns = focus ? columns.filter((c) => c.id === focus) : columns;

  const move = (q: Quotation, status: QuotationStatus) => {
    if (status === 'Converted') return convert(q);
    quotationActions.setStatus(q.id, status);
    const verb: Record<QuotationStatus, string> = {
      Draft: 'moved back to draft',
      Pending: 'submitted for approval',
      Approved: 'approved',
      Rejected: 'rejected',
      Converted: 'converted',
    };
    toast.success(`${q.id} ${verb[status]}`, { description: q.customer });
  };

  const convert = (q: Quotation) => {
    const order = quotationActions.convert(q.id, isoDate(0));
    if (order) {
      toast.success(`${q.id} converted to ${order.id}`, {
        description: 'The order is now on the Orders list.',
        action: { label: 'Open orders', onClick: () => router.push('/orders') },
      });
    }
  };

  const exportCsv = () => {
    saveBlob(
      csvBlob(
        ['Quotation', 'Status', 'Customer', 'Created by', 'Created', 'Closing', 'Lines', 'Discount %', 'Amount (USD)', 'Order'],
        visible.map((q) => [q.id, q.status, q.customer, q.createdBy, q.createdAt, q.closing, q.lines.length, q.discount, q.amount.toFixed(2), q.orderId ?? ''])
      ),
      `quotations-${fileStamp()}.csv`
    );
    toast.success('Quotations exported', { description: `${visible.length} rows saved as CSV.` });
  };

  const openEdit = (q: Quotation) => {
    setEditing(q);
    setFormOpen(true);
  };

  /** The next sensible steps for a quotation in its current stage. */
  const nextSteps = (q: Quotation): Array<{ label: string; icon: typeof FileText; run: () => void; danger?: boolean }> => {
    switch (q.status) {
      case 'Draft':
        return [{ label: 'Submit for approval', icon: Send, run: () => move(q, 'Pending') }];
      case 'Pending':
        return [
          { label: 'Approve', icon: CheckCircle2, run: () => move(q, 'Approved') },
          { label: 'Reject', icon: XCircle, run: () => move(q, 'Rejected'), danger: true },
        ];
      case 'Approved':
        return [{ label: 'Convert to order', icon: ShoppingCart, run: () => convert(q) }];
      case 'Rejected':
        return [{ label: 'Reopen as draft', icon: RotateCcw, run: () => move(q, 'Draft') }];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((col, i) => (
          <Card
            key={col.id}
            role="button"
            tabIndex={0}
            aria-pressed={focus === col.id}
            onClick={() => setFocus((f) => (f === col.id ? null : col.id))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFocus((f) => (f === col.id ? null : col.id)))}
            className={`p-4 border-gray-100 card-shadow animate-fade-in-up opacity-0 cursor-pointer transition-all ${focus === col.id ? 'ring-2 ring-primary/40' : 'hover:-translate-y-0.5'}`}
            style={{ borderRadius: '18px', animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl ${col.color} flex items-center justify-center`}>
                <col.icon size={15} className="text-gray-600" />
              </div>
              <span className="text-[11px] text-gray-400 font-500" style={{ fontWeight: 500 }}>{col.title}</span>
            </div>
            <p className="text-[22px] font-700 text-gray-900 dark:text-white" style={{ fontWeight: 700 }}>{counts[col.id]}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[16px] font-700 text-gray-900 dark:text-white mr-auto" style={{ fontWeight: 700 }}>
          Quotation Pipeline
          {focus && (
            <button type="button" onClick={() => setFocus(null)} className="ml-2 text-[11px] font-medium text-primary hover:underline">
              Show all stages
            </button>
          )}
        </h2>
        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation, customer, rep…"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-background/50 border border-surface text-[12px] text-main placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <select
          aria-label="Sort quotations"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
          className="h-9 rounded-xl bg-background/50 border border-surface px-3 text-[12px] text-main focus:outline-none focus:border-primary/30"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={exportCsv}>
          <FileSpreadsheet size={14} className="mr-1.5" /> Export
        </Button>
        <Button
          size="sm"
          className="rounded-xl gradient-primary text-white border-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={15} className="mr-1.5" /> New Quotation
        </Button>
      </div>

      {/* Kanban */}
      <div className={`grid grid-cols-1 gap-4 ${focus ? '' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
        {shownColumns.map((col, colIdx) => (
          <div key={col.id} className="space-y-3 animate-fade-in-up opacity-0" style={{ animationDelay: `${colIdx * 80}ms`, animationFillMode: 'forwards' }}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.color.replace('100', '400')}`} />
                <span className="text-[12px] font-700 text-gray-700 dark:text-gray-200" style={{ fontWeight: 700 }}>{col.title}</span>
              </div>
              <span className="text-[11px] text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-md">{byColumn[col.id].length}</span>
            </div>

            <div className={focus ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-3'}>
              {byColumn[col.id].length === 0 && (
                <p className="text-[11.5px] text-muted-foreground text-center py-6 rounded-xl border border-dashed border-surface">
                  {search ? 'No matches' : 'Nothing here'}
                </p>
              )}
              {/* Cards */}
              {byColumn[col.id].map((q, i) => (
                <Card
                  key={q.id}
                  onClick={() => setDetailId(q.id)}
                  className="p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0"
                  style={{ borderRadius: '14px', animationDelay: `${colIdx * 80 + Math.min(i, 8) * 40}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[11px] font-700 text-blue-600" style={{ fontWeight: 700 }}>{q.id}</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button aria-label={`Actions for ${q.id}`} className="text-gray-300 hover:text-gray-500">
                            <MoreHorizontal size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-[11px] text-muted-foreground">{q.id}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setDetailId(q.id)}>
                            <Eye size={14} className="mr-2" /> View details
                          </DropdownMenuItem>
                          {q.status !== 'Converted' && (
                            <DropdownMenuItem onClick={() => openEdit(q)}>
                              <Pencil size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          {nextSteps(q).map((s) => (
                            <DropdownMenuItem key={s.label} onClick={s.run} className={s.danger ? 'text-rose-600 focus:text-rose-600' : ''}>
                              <s.icon size={14} className="mr-2" /> {s.label}
                            </DropdownMenuItem>
                          ))}
                          {q.status !== 'Converted' && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ArrowRightLeft size={14} className="mr-2" /> Move to
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {columns.map((c) => (
                                  <DropdownMenuItem key={c.id} disabled={c.id === q.status} onClick={() => move(q, c.id)}>
                                    {c.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleting(q)} className="text-rose-600 focus:text-rose-600">
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-[13px] font-600 text-gray-900 dark:text-white mb-3" style={{ fontWeight: 600 }}>{q.customer}</p>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 flex items-center gap-1"><FileText size={11} /> Items</span>
                      <span className="font-600 text-gray-700 dark:text-gray-200" style={{ fontWeight: 600 }}>{q.lines.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 flex items-center gap-1"><Percent size={11} /> Discount</span>
                      <span className="font-600 text-gray-700 dark:text-gray-200" style={{ fontWeight: 600 }}>{q.discount}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 flex items-center gap-1"><User size={11} /> Created by</span>
                      <span className="font-500 text-gray-600 dark:text-gray-300" style={{ fontWeight: 500 }}>{q.createdBy}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 flex items-center gap-1"><Calendar size={11} /> Closing</span>
                      <span className="font-500 text-gray-600 dark:text-gray-300" style={{ fontWeight: 500 }}>{shortDate(q.closing)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-white/5">
                    <span className={`text-[9px] font-600 px-2 py-0.5 rounded-md ${approvalLevels[q.status].color}`} style={{ fontWeight: 600 }}>
                      {approvalLevels[q.status].level}
                    </span>
                    <span className="text-[14px] font-700 text-gray-900 dark:text-white" style={{ fontWeight: 700 }}>
                      ${Math.round(q.amount).toLocaleString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Details */}
      <DrawerPanel
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.id ?? ''}
        subtitle={detail ? `${detail.customer} · ${approvalLevels[detail.status].level}` : ''}
        icon={FileText}
        width="w-full sm:w-[480px] lg:w-[520px]"
        footer={
          detail && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ActionButton icon={Trash2} tone="danger" onClick={() => setDeleting(detail)}>
                Delete
              </ActionButton>
              <div className="flex flex-wrap items-center gap-2">
                {detail.status !== 'Converted' && (
                  <ActionButton icon={Pencil} onClick={() => openEdit(detail)}>
                    Edit
                  </ActionButton>
                )}
                {nextSteps(detail).map((s) => (
                  <ActionButton key={s.label} icon={s.icon} tone={s.danger ? 'danger' : 'primary'} onClick={s.run}>
                    {s.label}
                  </ActionButton>
                ))}
              </div>
            </div>
          )
        }
      >
        {detail && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${approvalLevels[detail.status].color}`}>{detail.status}</span>
              <span className="ml-auto text-[18px] font-bold text-main tabular-nums">${detail.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <DrawerSection title="Quotation">
              <FieldRow icon={Store} label="Depot" value={detail.customer} />
              <FieldRow icon={User} label="Created by" value={detail.createdBy} />
              <FieldRow icon={Calendar} label="Created" value={formatDate(detail.createdAt)} />
              <FieldRow icon={Clock} label="Closing" value={formatDate(detail.closing)} />
              <FieldRow icon={Percent} label="Discount" value={`${detail.discount}%`} />
              {detail.orderId && (
                <FieldRow
                  icon={ShoppingCart}
                  label="Order"
                  value={
                    <Link href="/orders" className="text-primary hover:underline">
                      {detail.orderId}
                    </Link>
                  }
                />
              )}
              {detail.notes && <FieldRow label="Notes" value={detail.notes} />}
            </DrawerSection>
            <DrawerSection title={`Items (${detail.lines.length})`}>
              <LineItemsTable lines={detail.lines} discount={detail.discount} total={detail.amount} />
            </DrawerSection>
          </>
        )}
      </DrawerPanel>

      <QuotationFormModal open={formOpen} quotation={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.id ?? 'quotation'}?`}
        body={deleting ? `The quotation for ${deleting.customer} will be removed from the pipeline. This cannot be undone.` : ''}
        confirmLabel="Delete quotation"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          quotationActions.remove(deleting.id);
          if (detailId === deleting.id) setDetailId(null);
          toast.success('Quotation deleted', { description: deleting.id });
          setDeleting(null);
        }}
      />
    </div>
  );
}
