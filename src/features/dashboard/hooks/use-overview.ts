'use client';

import { useMemo } from 'react';
import {
  DollarSign,
  FileText,
  ShoppingCart,
  Target,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/formatting';
import { useOrders } from '@/features/sales';
import {
  customerGrowthData,
  ordersData,
  provinceData,
  quotationConversion,
  salesRevenueData,
} from '../data/overview';

/**
 * The one dashboard read.
 *
 * Every shell's overview calls this and nothing else, so switching layout
 * cannot double a request — there is a single call site to point at the API
 * when it lands, and React Query will dedupe it from there. The KPI and summary
 * rows are built here rather than in `data/` because their labels are
 * translated, and `data/` stays free of React.
 */
export function useOverview() {
  const { t, formatCurrency } = useI18n();
  const orders = useOrders();

  // The five newest orders from the same store the Orders screen edits.
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        .slice(0, 5)
        .map((o) => ({ id: o.id, customer: o.customer, rep: o.rep, date: formatDate(o.date), status: o.status, total: o.total, payment: o.payment })),
    [orders]
  );

  // Static demo figures until the dashboard endpoint lands. Together the KPIs answer
  // "what sales activity/results are happening?"; `detail` carries the supporting numbers shown under the headline value.
  const stats = useMemo(
    () => [
      { title: t('stat.salesPerformance'), value: 1284500, prefix: '$', detail: t('stat.salesPerformanceDetail', { today: formatCurrency(48250), month: formatCurrency(1284500) }), trend: 12.5, icon: DollarSign, iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-500/10', sparkData: [30, 45, 38, 52, 48, 60, 72], sparkColor: '#004A98' },
      { title: t('stat.orders'), value: 286, detail: t('stat.ordersDetail', { amount: formatCurrency(1284500) }), trend: 6.1, icon: ShoppingCart, iconColor: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-50 dark:bg-orange-500/10', sparkData: [210, 240, 232, 255, 262, 270, 286], sparkColor: '#C0362C' },
      { title: t('stat.quotations'), value: 225, detail: t('stat.quotationsDetail', { pending: 52, approved: 145, rejected: 28 }), trend: 3.5, icon: FileText, iconColor: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', sparkData: [180, 190, 196, 204, 210, 218, 225], sparkColor: '#2F4FAE' },
      { title: t('stat.depotsAcquired'), value: 14, detail: t('stat.depotsAcquiredDetail', { total: 342 }), trend: 8.4, icon: Warehouse, iconColor: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50 dark:bg-green-500/10', sparkData: [6, 8, 7, 10, 9, 12, 14], sparkColor: '#2C9942' },
      { title: t('stat.salesTargetVsActual'), value: 94.4, suffix: '%', decimals: 1, detail: t('stat.targetVsActualDetail', { actual: formatCurrency(1284500), target: formatCurrency(1360000) }), trend: 3.2, icon: Target, iconColor: 'text-sky-500 dark:text-sky-400', iconBg: 'bg-sky-50 dark:bg-sky-500/10', sparkData: [82, 85, 84, 88, 90, 92, 94.4], sparkColor: '#4F92DA' },
      { title: t('stat.salesRepPerformance'), value: 75, suffix: '%', detail: t('stat.salesRepPerformanceDetail', { onTarget: 18, total: 24 }), trend: 4.1, icon: UserCheck, iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-500/10', sparkData: [60, 64, 62, 68, 70, 72, 75], sparkColor: '#D47C17' },
    ],
    [t, formatCurrency]
  );

  const performanceSummary = useMemo(
    () => [
      { label: t('chart.conversionRate'), value: '68.5%', trend: 'up' as const },
      { label: 'Avg. Order Value', value: '$24,580', trend: 'up' as const },
      { label: 'Customer Retention', value: '84.2%', trend: 'up' as const },
      { label: 'Visit Success Rate', value: '72.0%', trend: 'down' as const },
      { label: 'Quotation Acceptance', value: '55.8%', trend: 'up' as const },
      { label: 'Collection Rate', value: '91.3%', trend: 'up' as const },
    ],
    [t]
  );

  return {
    stats,
    performanceSummary,
    salesRevenueData,
    ordersData,
    quotationConversion,
    customerGrowthData,
    provinceData,
    recentOrders,
  };
}

export type OverviewStat = ReturnType<typeof useOverview>['stats'][number];
