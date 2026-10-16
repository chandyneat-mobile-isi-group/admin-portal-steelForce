'use client';

import { StatCard, MotionCard } from '@/components/shared/stat-card';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, MapPin, Download, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { saveBlob } from '@/lib/utilities/download';
import { csvBlob, fileStamp } from '@/services/mock';
import { useI18n } from '@/lib/i18n';
import { paymentColors, statusColors } from '../data/overview';
import { useOverview } from '../hooks/use-overview';

/**
 * The dense analyst grid — six KPIs, four charts, a regional breakdown and a
 * recent-orders table, all above the fold on a wide monitor.
 *
 * This is the portal's original dashboard, moved here unchanged. It is what the
 * ERP Workspace shell shows, and the reason that shell exists: someone who
 * lives in this screen wants everything visible at once.
 */
export function WorkspaceOverview() {
  const { t, formatCurrency, formatNumber } = useI18n();
  const {
    stats,
    performanceSummary,
    salesRevenueData,
    ordersData,
    quotationConversion,
    customerGrowthData,
    provinceData,
    recentOrders,
  } = useOverview();

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-surface rounded-xl p-3 card-shadow">
        <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-main">{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} index={i} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-main">{t('chart.salesRevenue')}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t('chart.salesRevenueDesc')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.revenue')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-200" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.target')}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Chart options" className="w-8 h-8 rounded-lg hover:bg-accent/50 flex items-center justify-center text-muted-foreground">
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() =>
                      saveBlob(
                        csvBlob(['Month', 'Revenue (USD)', 'Target (USD)'], salesRevenueData.map((r) => [r.month, r.revenue, r.target])),
                        `sales-revenue-${fileStamp()}.csv`
                      )
                    }
                  >
                    <Download size={14} className="mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reports/sales">
                      <BarChart3 size={14} className="mr-2" /> Open sales report
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesRevenueData} barGap={4}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#004A98" />
                  <stop offset="100%" stopColor="#0D63B5" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={customTooltip} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
              <Bar dataKey="target" fill="rgba(186,230,253,0.4)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-main">{t('chart.quotationConversion')}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t('chart.statusDistribution')}</p>
            </div>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={quotationConversion} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} cornerRadius={6}>
                  {quotationConversion.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[24px] font-bold text-main">260</p>
              <p className="text-[10px] text-muted-foreground">{t('chart.total')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {quotationConversion.map((q) => (
              <div key={q.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: q.color }} />
                <span className="text-[11px] text-muted-foreground">{q.name}</span>
                <span className="text-[11px] font-semibold text-main ml-auto">{q.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-main">{t('chart.monthlyOrders')}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t('chart.ordersReturnsTrend')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.orders')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.returns')}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} />
              <Tooltip content={customTooltip} cursor={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line type="monotone" dataKey="orders" stroke="#004A98" strokeWidth={2.5} dot={{ fill: '#004A98', r: 3 }} activeDot={{ r: 5, fill: '#004A98' }} />
              <Line type="monotone" dataKey="returns" stroke="#C0362C" strokeWidth={2.5} dot={{ fill: '#C0362C', r: 3 }} activeDot={{ r: 5, fill: '#C0362C' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-main">{t('chart.salesByProvince')}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t('chart.topRegions')}</p>
            </div>
            <MapPin size={18} className="text-primary" />
          </div>
          <div className="space-y-4">
            {provinceData.map((p, i) => (
              <motion.div
                key={p.province}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-muted-foreground">{p.province}</span>
                  <span className="text-[12px] font-semibold text-main">${p.sales}k</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #004A98, #4F92DA)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.percentage}%` }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-main">{t('chart.customerGrowth')}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t('chart.customerGrowthDesc')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.customers')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                <span className="text-[11px] text-muted-foreground font-medium">{t('chart.new')}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={customerGrowthData}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#004A98" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#004A98" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F92DA" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F92DA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ADBACA' }} />
              <Tooltip content={customTooltip} cursor={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="customers" stroke="#004A98" strokeWidth={2.5} fill="url(#totalGrad)" />
              <Area type="monotone" dataKey="new" stroke="#4F92DA" strokeWidth={2.5} fill="url(#newGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <h3 className="text-[16px] font-bold text-main mb-5">Performance Summary</h3>
          <div className="space-y-3">
            {performanceSummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-surface last:border-0">
                <span className="text-[12px] text-muted-foreground font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-main">{item.value}</span>
                  {item.trend === 'up' ? (
                    <ArrowUpRight size={14} className="text-green-500" />
                  ) : (
                    <ArrowDownRight size={14} className="text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-bold text-main">Recent Orders</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Latest 5 orders across all reps</p>
          </div>
          <Link href="/orders" className="text-[12px] text-primary font-semibold hover:opacity-80 transition-opacity">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2">{t('table.orderNumber')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2">{t('table.customer')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2 hidden md:table-cell">{t('table.salesRep')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2 hidden lg:table-cell">{t('table.date')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2">{t('table.status')}</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2">{t('table.total')}</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-2 hidden md:table-cell">{t('table.payment')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.05, duration: 0.3 }}
                  className="border-b border-surface last:border-0 hover:bg-accent/20 transition-colors duration-150"
                >
                  <td className="py-3.5 px-2">
                    <span className="text-[12px] font-semibold text-primary">{order.id}</span>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="text-[12px] font-medium text-main">{order.customer}</span>
                  </td>
                  <td className="py-3.5 px-2 hidden md:table-cell">
                    <span className="text-[12px] text-muted-foreground">{order.rep}</span>
                  </td>
                  <td className="py-3.5 px-2 hidden lg:table-cell">
                    <span className="text-[12px] text-muted-foreground">{order.date}</span>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[order.status]}`}>
                      {t(`status.${order.status.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <span className="text-[12px] font-bold text-main">{formatCurrency(order.total)}</span>
                  </td>
                  <td className="py-3.5 px-2 text-right hidden md:table-cell">
                    <span className={`text-[12px] font-medium ${paymentColors[order.payment]}`}>
                      {t(`status.${order.payment.toLowerCase()}`)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
