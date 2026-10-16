'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  FileText,
  Check,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuotationDecision, useQuotationList } from '@/features/approvals';
import { QUOTATION_STATUS_LABEL, quotationTotals, type QuotationStatus } from '@/features/depots';

/** The statuses the queue can be narrowed to. The default is the work: pending. */
const STATUS_FILTERS: { value: QuotationStatus | 'all'; label: string }[] = [
  { value: 'PendingApproval', label: 'Pending approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Expired', label: 'Expired' },
  { value: 'all', label: 'All quotations' },
];

const STATUS_PILL: Record<QuotationStatus, string> = {
  PendingApproval: 'bg-amber-50 text-amber-700',
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Draft: 'bg-gray-100 text-gray-600',
  Expired: 'bg-gray-100 text-gray-500',
};

export default function QuotationsApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('PendingApproval');
  const [filterOpen, setFilterOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // The whole book is small enough to hold; KPIs and the filter both read from it.
  const list = useQuotationList({ pageSize: 500 });
  const { approve, reject } = useQuotationDecision();

  const quotations = useMemo(
    () =>
      (list.data?.items ?? []).map((q) => ({
        id: q.id,
        client: q.customerName,
        rep: q.repName,
        value: quotationTotals(q).total,
        date: new Date(q.submittedAt ?? q.createdAt),
        decidedAt: q.decidedAt ? new Date(q.decidedAt) : null,
        status: q.status,
      })),
    [list.data]
  );

  const pendingCount = quotations.filter(q => q.status === 'PendingApproval').length;
  const today = new Date().toDateString();
  const approvedToday = quotations.filter(q => q.status === 'Approved' && q.decidedAt?.toDateString() === today).length;

  const totalPendingValue = quotations
    .filter(q => q.status === 'PendingApproval')
    .reduce((sum, q) => sum + q.value, 0);

  const handleAction = async (id: string, decision: 'approved' | 'rejected') => {
    setActing(id);
    try {
      if (decision === 'approved') await approve.mutateAsync(id);
      else await reject.mutateAsync({ id });
      toast.success(`${id} ${decision}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The decision could not be saved.');
    } finally {
      setActing(null);
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredQuotas = quotations.filter(q =>
    (q.client.toLowerCase().includes(term) ||
     q.id.toLowerCase().includes(term) ||
     q.rep.toLowerCase().includes(term)) &&
    (statusFilter === 'all' || q.status === statusFilter)
  );

  const activeFilter = STATUS_FILTERS.find((f) => f.value === statusFilter) ?? STATUS_FILTERS[0];

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotations Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve pending sales quotations</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0 relative overflow-hidden" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Clock size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Approval</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500 font-medium mb-1 line-clamp-1">Quotations</p>
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '75ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <FileText size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Pending Value</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalPendingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 border border-gray-100 shadow-sm transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Approved Today</p>
          <p className="text-3xl font-bold text-gray-900">{approvedToday}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '150ms' }}>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, Client or Rep..." 
                className="w-full pl-9 bg-gray-50/50 border border-gray-200 rounded-xl h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                aria-expanded={filterOpen}
                className="h-10 border border-gray-200 rounded-xl px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
              >
                <Filter size={16} className="mr-2" />
                {statusFilter === 'PendingApproval' ? 'Filter' : activeFilter.label}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div role="radiogroup" className="absolute left-0 top-11 z-20 w-52 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
                    {STATUS_FILTERS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={statusFilter === option.value}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                          statusFilter === option.value ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                        {statusFilter === option.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Quotation ID</th>
                <th className="px-6 py-4 font-medium text-gray-500">Client</th>
                <th className="px-6 py-4 font-medium text-gray-500">Sales Rep</th>
                <th className="px-6 py-4 font-medium text-gray-500">Date Submitted</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Total Value</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {list.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-300">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                ) : filteredQuotas.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="text-green-500" size={24} />
                        </div>
                        <p className="text-gray-900 font-medium">
                          {statusFilter === 'PendingApproval' && !searchTerm ? 'All caught up!' : 'Nothing here'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {statusFilter === 'PendingApproval' && !searchTerm
                            ? 'No pending quotations require your approval.'
                            : 'No quotations match this search and filter.'}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredQuotas.map((q) => (
                    <motion.tr 
                      key={q.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/approval/quotations/${q.id}`} className="font-medium text-primary cursor-pointer hover:underline">
                          {q.id}
                        </Link>
                        {statusFilter !== 'PendingApproval' && (
                          <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_PILL[q.status]}`}>
                            {QUOTATION_STATUS_LABEL[q.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{q.client}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {q.rep.split(' ').map(n => n[0]).join('')}
                          </div>
                          {q.rep}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(q.date, 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 tabular-nums">
                        ${q.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {q.status === 'PendingApproval' && (
                            <>
                              <button
                                onClick={() => void handleAction(q.id, 'rejected')}
                                disabled={acting !== null}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                              <button
                                onClick={() => void handleAction(q.id, 'approved')}
                                disabled={acting !== null}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                                title="Approve"
                              >
                                {acting === q.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                              </button>
                            </>
                          )}
                          <Link
                            href={`/approval/quotations/${q.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Open quotation"
                          >
                            <MoreHorizontal size={18} />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
