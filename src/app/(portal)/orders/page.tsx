'use client';

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
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Store,
  User,
  CalendarDays,
  Truck,
  Wallet,
  MapPin,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/formatting';
import { saveBlob } from '@/lib/utilities/download';
import { csvBlob, fileStamp, paginate, pdfBlob } from '@/services/mock';
import {
  LineItemsTable,
  ORDER_STATUSES,
  OrderFormModal,
  PAYMENT_STATUSES,
  orderActions,
  useOrders,
  type OrderStatus,
  type PaymentStatus,
  type SalesOrder,
} from '@/features/sales';
import { PROVINCES } from '@/features/planning';

const statusColors: Record<string, string> = {
  Confirmed: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  Processing: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Completed: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  Pending: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  Cancelled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

const paymentColors: Record<string, string> = {
  Paid: 'text-green-600 dark:text-green-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Unpaid: 'text-red-600 dark:text-red-400',
  Refunded: 'text-muted-foreground',
  Partial: 'text-sky-600 dark:text-sky-400',
};

const statusFilterKeys = ['filter.all', 'status.pending', 'status.confirmed', 'status.processing', 'status.completed', 'status.cancelled'];
const statusFilterValues = ['All', 'Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled'];

const PAGE_SIZE = 10;

type SortKey = 'id' | 'customer' | 'date' | 'total';

const FILTER_INPUT =
  'h-9 rounded-xl bg-background/50 border border-surface px-3 text-[12px] text-main focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10';

export default function OrdersPage() {
  const { t, formatCurrency } = useI18n();
  const orders = useOrders();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [payment, setPayment] = useState('All');
  const [province, setProvince] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [deleting, setDeleting] = useState<SalesOrder | null>(null);

  const detail = detailId ? orders.find((o) => o.id === detailId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = orders.filter((o) => {
      if (activeFilter !== 'All' && o.status !== activeFilter) return false;
      if (payment !== 'All' && o.payment !== payment) return false;
      if (province !== 'All' && o.province !== province) return false;
      if (from && o.date < from) return false;
      if (to && o.date > to) return false;
      if (q && !`${o.id} ${o.customer} ${o.rep}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return cmp * dir || b.id.localeCompare(a.id);
    });
  }, [orders, activeFilter, payment, province, from, to, search, sort]);

  // Any change to the result set starts again from page one.
  useEffect(() => setPage(1), [activeFilter, payment, province, from, to, search, sort]);

  const paged = paginate(filtered, page, PAGE_SIZE);
  const firstRow = paged.total === 0 ? 0 : (paged.page - 1) * PAGE_SIZE + 1;
  const lastRow = (paged.page - 1) * PAGE_SIZE + paged.items.length;
  const advancedCount = [payment !== 'All', province !== 'All', !!from, !!to].filter(Boolean).length;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'customer' || key === 'id' ? 'asc' : 'desc' }));

  const setStatus = (order: SalesOrder, status: OrderStatus) => {
    // Cancelling a paid order refunds it; completing an unpaid one leaves payment for finance.
    const patch: { status: OrderStatus; payment?: PaymentStatus } = { status };
    if (status === 'Cancelled' && (order.payment === 'Paid' || order.payment === 'Partial')) patch.payment = 'Refunded';
    orderActions.patch(order.id, patch);
    toast.success(`${order.id} marked ${status.toLowerCase()}`);
  };

  const setPaymentStatus = (order: SalesOrder, next: PaymentStatus) => {
    orderActions.patch(order.id, { payment: next });
    toast.success(`${order.id} payment set to ${next.toLowerCase()}`);
  };

  const exportCsv = () => {
    saveBlob(
      csvBlob(
        ['Order', 'Date', 'Customer', 'Province', 'Sales rep', 'Status', 'Payment', 'Lines', 'Discount %', 'Total (USD)', 'Delivery date'],
        filtered.map((o) => [o.id, o.date, o.customer, o.province, o.rep, o.status, o.payment, o.lines.length, o.discount, o.total.toFixed(2), o.deliveryDate])
      ),
      `orders-${fileStamp()}.csv`
    );
    toast.success('Orders exported', { description: `${filtered.length} rows saved as CSV.` });
  };

  const exportPdf = () => {
    const total = filtered.reduce((s, o) => s + o.total, 0);
    saveBlob(
      pdfBlob('SteelForce - Sales orders', [
        `Generated ${new Date().toLocaleString()}`,
        `${filtered.length} orders - ${formatCurrency(total)}`,
        '',
        ...filtered.slice(0, 28).map((o) => `${o.id}  ${o.date}  ${o.customer.slice(0, 30)}  ${o.status}  ${formatCurrency(o.total)}`),
        ...(filtered.length > 28 ? [`... and ${filtered.length - 28} more (export Excel for the full list)`] : []),
      ]),
      `orders-${fileStamp()}.pdf`
    );
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (order: SalesOrder) => {
    setEditing(order);
    setFormOpen(true);
  };

  const pageNumbers = useMemo(() => {
    const total = paged.totalPages;
    const current = paged.page;
    const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
    return Array.from(set).sort((a, b) => a - b);
  }, [paged.totalPages, paged.page]);

  const SortHeader = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <th className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 ${className}`}>
      <button type="button" onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-main ${sort.key === k ? 'text-primary' : ''}`}>
        {label}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search.orders')}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {statusFilterKeys.map((key, i) => {
              const value = statusFilterValues[i];
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(value)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                    activeFilter === value ? 'gradient-primary text-white shadow-md shadow-blue-200/50' : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <Button
              variant="outline"
              size="sm"
              className={`rounded-xl text-[12px] ${showFilters || advancedCount ? 'border-primary/40 text-primary' : ''}`}
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={14} className="mr-1.5" /> {t('filter.filters')}
              {advancedCount > 0 && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold">{advancedCount}</span>}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={exportCsv}>
              <FileSpreadsheet size={14} className="mr-1.5" /> {t('button.excel')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={exportPdf}>
              <FileText size={14} className="mr-1.5" /> {t('button.pdf')}
            </Button>
            <Button size="sm" className="rounded-xl gradient-primary text-white border-0 text-[12px]" onClick={openCreate}>
              <Plus size={14} className="mr-1.5" /> New order
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-surface flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              Payment
              <select value={payment} onChange={(e) => setPayment(e.target.value)} className={FILTER_INPUT}>
                <option value="All">All payments</option>
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              Province
              <select value={province} onChange={(e) => setProvince(e.target.value)} className={FILTER_INPUT}>
                <option value="All">All provinces</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              From
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={FILTER_INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              To
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={FILTER_INPUT} />
            </label>
            {advancedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPayment('All');
                  setProvince('All');
                  setFrom('');
                  setTo('');
                }}
                className="h-9 inline-flex items-center gap-1 px-2 text-[12px] font-medium text-primary hover:underline"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Data Table */}
      <Card className="border-surface card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <SortHeader k="id" label={t('table.orderNumber')} className="text-left" />
                <SortHeader k="customer" label={t('table.customer')} className="text-left" />
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 hidden md:table-cell">{t('table.salesRep')}</th>
                <SortHeader k="date" label={t('table.date')} className="text-left hidden lg:table-cell" />
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.status')}</th>
                <SortHeader k="total" label={t('table.total')} className="text-right" />
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 hidden md:table-cell">{t('table.payment')}</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.items.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => setDetailId(order.id)}
                  className="border-t border-surface hover:bg-accent/20 transition-colors duration-150 cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-semibold text-primary">{order.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-medium text-main">{order.customer}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-[12px] text-muted-foreground">{order.rep}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-[12px] text-muted-foreground">{formatDate(order.date)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[order.status]}`}>
                      {t(`status.${order.status.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[12px] font-bold text-main">{formatCurrency(order.total)}</span>
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <span className={`text-[12px] font-medium ${paymentColors[order.payment]}`}>
                      {t(`status.${order.payment.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button aria-label={`Actions for ${order.id}`} className="w-8 h-8 rounded-lg hover:bg-accent/50 inline-flex items-center justify-center text-muted-foreground transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-[11px] text-muted-foreground">{order.id}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setDetailId(order.id)}>
                          <Eye size={14} className="mr-2" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(order)}>
                          <Pencil size={14} className="mr-2" /> Edit order
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <RefreshCw size={14} className="mr-2" /> Change status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {ORDER_STATUSES.map((s) => (
                              <DropdownMenuItem key={s} disabled={s === order.status} onClick={() => setStatus(order, s)}>
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Wallet size={14} className="mr-2" /> Payment
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {PAYMENT_STATUSES.map((p) => (
                              <DropdownMenuItem key={p} disabled={p === order.payment} onClick={() => setPaymentStatus(order, p)}>
                                {p}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleting(order)} className="text-rose-600 focus:text-rose-600">
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
              {paged.items.length === 0 && (
                <tr className="border-t border-surface">
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <p className="text-[13px] font-semibold text-main">No orders match these filters</p>
                    <p className="text-[12px] text-muted-foreground mt-1">Clear the search or widen the status, payment or date filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface">
          <p className="text-[11px] text-muted-foreground">
            {t('table.showing')} <span className="font-semibold text-main">{firstRow}-{lastRow}</span> {t('table.of')} <span className="font-semibold text-main">{paged.total}</span> {t('table.orders')}
          </p>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              onClick={() => setPage(paged.page - 1)}
              disabled={paged.page <= 1}
              className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((p, idx) => (
              <span key={p} className="flex items-center gap-1">
                {idx > 0 && p - pageNumbers[idx - 1] > 1 && <span className="text-muted-foreground px-1">...</span>}
                <button
                  onClick={() => setPage(p)}
                  aria-current={p === paged.page ? 'page' : undefined}
                  className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${p === paged.page ? 'gradient-primary text-white' : 'text-muted-foreground hover:bg-accent/50'}`}
                >
                  {p}
                </button>
              </span>
            ))}
            <button
              aria-label="Next page"
              onClick={() => setPage(paged.page + 1)}
              disabled={paged.page >= paged.totalPages}
              className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Details */}
      <DrawerPanel
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.id ?? ''}
        subtitle={detail ? `${detail.customer} · ${detail.province}` : ''}
        icon={ShoppingCart}
        width="w-full sm:w-[480px] lg:w-[520px]"
        footer={
          detail && (
            <div className="flex items-center justify-between gap-2">
              <ActionButton icon={Trash2} tone="danger" onClick={() => setDeleting(detail)}>
                Delete
              </ActionButton>
              <ActionButton icon={Pencil} tone="primary" onClick={() => openEdit(detail)}>
                Edit order
              </ActionButton>
            </div>
          )
        }
      >
        {detail && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[detail.status]}`}>
                {t(`status.${detail.status.toLowerCase()}`)}
              </span>
              <span className={`text-[12px] font-semibold ${paymentColors[detail.payment]}`}>{detail.payment}</span>
              <span className="ml-auto text-[18px] font-bold text-main tabular-nums">{formatCurrency(detail.total)}</span>
            </div>

            <DrawerSection title="Order">
              <FieldRow icon={Store} label="Depot" value={detail.customer} />
              <FieldRow icon={MapPin} label="Province" value={detail.province} />
              <FieldRow icon={User} label="Sales rep" value={detail.rep} />
              <FieldRow icon={CalendarDays} label="Order date" value={formatDate(detail.date)} />
              <FieldRow icon={Truck} label="Delivery" value={formatDate(detail.deliveryDate)} />
              {detail.quotationId && <FieldRow icon={FileText} label="From quotation" value={detail.quotationId} />}
              {detail.notes && <FieldRow label="Notes" value={detail.notes} />}
            </DrawerSection>

            <DrawerSection title="Status">
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => s !== detail.status && setStatus(detail, s)}
                    className={`px-3 py-1.5 rounded-xl text-[11.5px] font-medium border transition-colors ${
                      s === detail.status ? 'gradient-primary text-white border-transparent' : 'border-surface text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title={`Items (${detail.lines.length})`}>
              <LineItemsTable lines={detail.lines} discount={detail.discount} total={detail.total} />
            </DrawerSection>
          </>
        )}
      </DrawerPanel>

      <OrderFormModal open={formOpen} order={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.id ?? 'order'}?`}
        body={deleting ? `The ${formatCurrency(deleting.total)} order for ${deleting.customer} will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete order"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          orderActions.remove(deleting.id);
          if (detailId === deleting.id) setDetailId(null);
          toast.success('Order deleted', { description: deleting.id });
          setDeleting(null);
        }}
      />
    </div>
  );
}
