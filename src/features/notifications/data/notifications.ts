import { TODAY } from '@/lib/utilities/demo-clock';
import { formatCurrency } from '@/lib/formatting';
import { buildOrders } from '@/features/sales/data/orders';
import { buildQuotations } from '@/features/sales/data/quotations';
import { products, stock, stockStatus, WAREHOUSES } from '@/features/materials/data/catalog';
import { crmDepots } from '@/features/depots/data/crm';
import { salesReps } from '@/features/planning/data/demo-data';

/**
 * The notification centre's feed.
 *
 * Built from the same seeds as Orders, Quotations, Materials and Depots, so
 * every notification names a record that exists and its link opens the screen
 * where that record lives.
 */

export const NOTIFICATION_TYPES = ['order', 'quotation', 'payment', 'visit', 'depot', 'stock', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface PortalNotification {
  id: string;
  type: NotificationType;
  /** Visual tone — success, failure, warning or neutral information. */
  tone: 'positive' | 'critical' | 'warning' | 'info';
  title: string;
  desc: string;
  /** ISO timestamp. */
  at: string;
  unread: boolean;
  href: string;
}

/** "Now" for the demo feed: 10:30 Phnom Penh time on the demo date. */
export const DEMO_NOW = new Date(TODAY.getTime() + 3.5 * 3600_000);

const minutesAgo = (m: number) => new Date(DEMO_NOW.getTime() - m * 60_000).toISOString();

export function buildNotifications(): PortalNotification[] {
  const orders = buildOrders();
  const quotes = buildQuotations();
  const byStatus = (s: string) => quotes.filter((q) => q.status === s);
  const confirmed = orders.find((o) => o.status === 'Confirmed') ?? orders[2];
  const completed = orders.filter((o) => o.status === 'Completed');
  const paid = orders.filter((o) => o.payment === 'Paid');
  const lowRows = stock.filter((r) => stockStatus(r) === 'Low Stock' || stockStatus(r) === 'Out of Stock');
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const warehouse = (id: string) => WAREHOUSES.find((w) => w.id === id)?.name ?? id;
  const newDepots = [...crmDepots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rep = (i: number) => salesReps[i % salesReps.length].name;

  const items: Omit<PortalNotification, 'id'>[] = [
    { type: 'order', tone: 'info', title: 'New order received', desc: `${orders[0].id} from ${orders[0].customer} — ${formatCurrency(orders[0].total)}`, at: minutesAgo(2), unread: true, href: '/orders' },
    { type: 'quotation', tone: 'critical', title: 'Quotation rejected', desc: `${byStatus('Rejected')[0].id} for ${byStatus('Rejected')[0].customer} was declined at Level 2`, at: minutesAgo(58), unread: true, href: '/quotations' },
    { type: 'stock', tone: 'warning', title: 'Low stock alert', desc: `${productName(lowRows[0].productId)} at ${warehouse(lowRows[0].warehouseId)} is below its reorder level`, at: minutesAgo(124), unread: true, href: '/materials/inventory' },
    { type: 'quotation', tone: 'warning', title: 'Approval required', desc: `${byStatus('Pending')[0].id} (${formatCurrency(byStatus('Pending')[0].amount)}) is waiting for your approval`, at: minutesAgo(150), unread: true, href: '/approval/quotations' },
    { type: 'visit', tone: 'info', title: 'Visit completed', desc: `${rep(0)} checked out at ${orders[1].customer}`, at: minutesAgo(185), unread: false, href: '/visits' },
    { type: 'payment', tone: 'positive', title: 'Payment received', desc: `${formatCurrency(paid[0].total)} received for ${paid[0].id} from ${paid[0].customer}`, at: minutesAgo(240), unread: false, href: '/orders' },
    { type: 'order', tone: 'positive', title: 'Order confirmed', desc: `${confirmed.id} for ${confirmed.customer} was confirmed by ${confirmed.rep}`, at: minutesAgo(300), unread: true, href: '/orders' },
    { type: 'visit', tone: 'warning', title: 'Visit missed', desc: `${rep(7)} did not check in at ${orders[5].customer} by 10:00`, at: minutesAgo(30), unread: true, href: '/planning/plan-vs-actual' },
    { type: 'depot', tone: 'info', title: 'New depot registered', desc: `${newDepots[0].name} (${newDepots[0].province}) was submitted for approval`, at: minutesAgo(60 * 19), unread: true, href: '/approval/depots' },
    { type: 'system', tone: 'info', title: 'System update', desc: 'SteelForce portal updated to version 2.4.0', at: minutesAgo(60 * 22), unread: false, href: '/settings' },
    { type: 'order', tone: 'positive', title: 'Order delivered', desc: `${completed[0].id} for ${completed[0].customer} was delivered and signed for`, at: minutesAgo(60 * 25), unread: false, href: '/orders' },
    { type: 'stock', tone: 'warning', title: 'Low stock alert', desc: `${productName(lowRows[1].productId)} at ${warehouse(lowRows[1].warehouseId)} is below its reorder level`, at: minutesAgo(60 * 27), unread: false, href: '/materials/inventory' },
    { type: 'payment', tone: 'warning', title: 'Payment overdue', desc: `${orders[8].customer} has ${formatCurrency(orders[8].total)} outstanding on ${orders[8].id}`, at: minutesAgo(60 * 29), unread: true, href: '/orders' },
    { type: 'quotation', tone: 'positive', title: 'Quotation approved', desc: `${byStatus('Approved')[0].id} for ${byStatus('Approved')[0].customer} is ready to convert`, at: minutesAgo(60 * 31), unread: false, href: '/quotations' },
    { type: 'quotation', tone: 'info', title: 'Quotation converted', desc: `${byStatus('Converted')[0].id} was converted to order ${byStatus('Converted')[0].orderId}`, at: minutesAgo(60 * 52), unread: false, href: '/quotations' },
    { type: 'system', tone: 'positive', title: 'Backup completed', desc: 'Monthly data backup completed successfully', at: minutesAgo(60 * 76), unread: false, href: '/settings' },
    { type: 'payment', tone: 'positive', title: 'Payment received', desc: `${formatCurrency(paid[3].total)} received for ${paid[3].id} from ${paid[3].customer}`, at: minutesAgo(60 * 98), unread: false, href: '/orders' },
    { type: 'depot', tone: 'positive', title: 'Depot approved', desc: `${newDepots[1].name} is now an active trading account`, at: minutesAgo(60 * 120), unread: false, href: '/depots' },
    { type: 'visit', tone: 'info', title: 'Call plan uploaded', desc: `Next week's call plan for ${salesReps[2].team} was imported (48 stops)`, at: minutesAgo(60 * 140), unread: false, href: '/planning/call-plans' },
    { type: 'order', tone: 'critical', title: 'Order cancelled', desc: `${(orders.find((o) => o.status === 'Cancelled') ?? orders[9]).id} was cancelled by the customer`, at: minutesAgo(60 * 165), unread: false, href: '/orders' },
  ];

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((n, i) => ({ ...n, id: `NTF-${String(i + 1).padStart(3, '0')}` }));
}
