'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import { useQuotation, useQuotationDecision } from '@/features/approvals';
import { QUOTATION_STATUS_LABEL, quotationTotals, type QuotationStatus } from '@/features/depots';

const STATUS_PILL: Record<QuotationStatus, string> = {
  PendingApproval: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Approved: 'bg-green-50 text-green-700 ring-green-600/20',
  Rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  Draft: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  Expired: 'bg-gray-50 text-gray-500 ring-gray-500/20',
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const { approve, reject } = useQuotationDecision();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen">
        <Link href="/approval/quotations" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to Quotations
        </Link>
        <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-[18px] text-center">
          <p className="text-gray-900 font-medium">Quotation {quotationId} was not found.</p>
          <p className="text-gray-500 text-sm mt-1">It may have been removed, or the link is mistyped.</p>
        </div>
      </div>
    );
  }

  const lines = quotation.lines;
  const { subtotal, vat: tax, total: grandTotal } = quotationTotals(quotation);
  const pending = quotation.status === 'PendingApproval';
  const submitted = new Date(quotation.submittedAt ?? quotation.createdAt);
  const validTo = new Date(quotation.validTo);
  const validityDays = Math.max(0, differenceInCalendarDays(validTo, submitted));

  const decide = async (decision: 'approve' | 'reject') => {
    const setBusy = decision === 'approve' ? setIsApproving : setIsRejecting;
    setBusy(true);
    try {
      if (decision === 'approve') await approve.mutateAsync(quotation.id);
      else await reject.mutateAsync({ id: quotation.id });
      toast.success(`${quotation.number} ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      router.push('/approval/quotations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The decision could not be saved.');
      setBusy(false);
    }
  };

  const handleApprove = () => void decide('approve');
  const handleReject = () => void decide('reject');

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto min-h-screen pb-24">
      {/* Breadcrumb & Header */}
      <div className="mb-6 animate-fade-in-up">
        <Link 
          href="/approval/quotations" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Quotations
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Quotation {quotation.number}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${STATUS_PILL[quotation.status]}`}>
                {QUOTATION_STATUS_LABEL[quotation.status]}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {quotation.submittedAt ? 'Submitted' : 'Created'} on {format(submitted, 'MMMM do, yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Document (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-100 shadow-sm rounded-[18px] overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">Product</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Quantity</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Unit Price</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.product}</div>
                        <div className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-600">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums text-gray-900">
                        ${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-gray-500 font-medium">Subtotal</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums">
                      ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-gray-500 font-medium">VAT (10%)</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums">
                      ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right text-gray-900 font-bold text-base">Grand Total</td>
                    <td className="px-6 py-4 text-right font-bold text-lg text-primary tabular-nums">
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Context & Actions (Right Column) */}
        <div className="space-y-6">
          
          {/* Approval Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 border border-gray-100 shadow-sm rounded-[18px]"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Manager Decision</h3>
            {!pending && (
              <p className="mb-3 text-sm text-gray-600">
                {quotation.status === 'Approved' || quotation.status === 'Rejected'
                  ? `${QUOTATION_STATUS_LABEL[quotation.status]} by ${quotation.decidedBy ?? 'an approver'}${
                      quotation.decidedAt ? ` on ${format(new Date(quotation.decidedAt), 'MMM d, yyyy HH:mm')}` : ''
                    }.`
                  : `This quotation is ${QUOTATION_STATUS_LABEL[quotation.status].toLowerCase()} and is not waiting for a decision.`}
                {quotation.rejectionReason && <span className="mt-1 block text-red-700">{quotation.rejectionReason}</span>}
              </p>
            )}
            <div className="space-y-3">
              <button 
                onClick={handleApprove}
                disabled={!pending || isApproving || isRejecting}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isApproving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle2 size={18} /> Approve Quotation</>
                )}
              </button>
              <button 
                onClick={handleReject}
                disabled={!pending || isApproving || isRejecting}
                className="w-full h-12 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRejecting ? (
                  <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                ) : (
                  <><XCircle size={18} /> Reject</>
                )}
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Approving this quotation will lock the prices and allow the customer to proceed with order generation.
              </p>
            </div>
          </motion.div>

          {/* Client Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 border border-gray-100 shadow-sm rounded-[18px]"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Client Context</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Company</p>
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs">{initialsOf(quotation.customerName)}</div>
                  {quotation.customerName}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Prepared By</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <User size={16} className="text-gray-400" />
                  {quotation.repName} (Sales Rep)
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Delivery Location</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  {quotation.deliveryLocation}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Validity</p>
                <div className="flex items-center gap-2 text-gray-900 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  Valid until {format(validTo, 'MMM d, yyyy')} ({validityDays} Days)
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
