/**
 * The business overview dataset.
 *
 * One source for every dashboard presentation. The three workspace shells each
 * show this differently — an app-centric summary, a module-oriented operations
 * view, a dense analyst grid — but they all read these same rows, so there is
 * one place to swap demo data for the real endpoint and no shell can drift from
 * another.
 *
 * Moved here verbatim from `app/(portal)/dashboard/page.tsx`, where it was
 * inline and therefore unusable by anything else.
 *
 * Colours are brand values; see `docs/design-system.md`.
 */

export const salesRevenueData = [
  { month: 'Jan', revenue: 420000, target: 450000 },
  { month: 'Feb', revenue: 480000, target: 460000 },
  { month: 'Mar', revenue: 520000, target: 500000 },
  { month: 'Apr', revenue: 490000, target: 520000 },
  { month: 'May', revenue: 580000, target: 540000 },
  { month: 'Jun', revenue: 640000, target: 600000 },
  { month: 'Jul', revenue: 680000, target: 650000 },
  { month: 'Aug', revenue: 720000, target: 700000 },
  { month: 'Sep', revenue: 780000, target: 750000 },
  { month: 'Oct', revenue: 820000, target: 800000 },
  { month: 'Nov', revenue: 880000, target: 850000 },
  { month: 'Dec', revenue: 940000, target: 900000 },
];

export const ordersData = [
  { month: 'Jan', orders: 120, returns: 8 },
  { month: 'Feb', orders: 145, returns: 10 },
  { month: 'Mar', orders: 160, returns: 6 },
  { month: 'Apr', orders: 180, returns: 12 },
  { month: 'May', orders: 210, returns: 9 },
  { month: 'Jun', orders: 240, returns: 14 },
  { month: 'Jul', orders: 265, returns: 11 },
  { month: 'Aug', orders: 290, returns: 8 },
];

export const quotationConversion = [
  { name: 'Converted', value: 145, color: '#004A98' },
  { name: 'Pending', value: 52, color: '#4F92DA' },
  { name: 'Rejected', value: 28, color: '#C0362C' },
  { name: 'Draft', value: 35, color: '#DCE3EB' },
];

export const customerGrowthData = [
  { month: 'Jan', customers: 800, new: 40 },
  { month: 'Feb', customers: 880, new: 80 },
  { month: 'Mar', customers: 950, new: 70 },
  { month: 'Apr', customers: 1020, new: 70 },
  { month: 'May', customers: 1080, new: 60 },
  { month: 'Jun', customers: 1150, new: 70 },
  { month: 'Jul', customers: 1200, new: 50 },
  { month: 'Aug', customers: 1240, new: 40 },
];

export const provinceData = [
  { province: 'Phnom Penh', sales: 420, percentage: 35 },
  { province: 'Siem Reap', sales: 280, percentage: 23 },
  { province: 'Battambang', sales: 195, percentage: 16 },
  { province: 'Preah Sihanouk', sales: 165, percentage: 14 },
  { province: 'Kandal', sales: 130, percentage: 12 },
];

export const statusColors: Record<string, string> = {
  Confirmed: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  Processing: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Completed: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  Pending: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  Cancelled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

export const paymentColors: Record<string, string> = {
  Paid: 'text-green-600 dark:text-green-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Unpaid: 'text-red-600 dark:text-red-400',
  Refunded: 'text-muted-foreground',
  Partial: 'text-sky-600 dark:text-sky-400',
};

// ── Today ────────────────────────────────────────────────────────────────────
//
// Demo figures for the daily sales dashboard. Every headline number on it is summed
// from these rows, so the cards, the visit breakdown and the rep table cannot disagree.

export type RepDayStatus = 'Visiting' | 'On Route' | 'Done' | 'Not Checked In' | 'Off';

export interface RepDayActivity {
  id: string;
  name: string;
  team: string;
  status: RepDayStatus;
  planned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  orders: number;
  sales: number;
}

const rep = (
  id: string, name: string, team: string, status: RepDayStatus,
  planned: number, completed: number, inProgress: number, notStarted: number,
  orders: number, sales: number
): RepDayActivity => ({ id, name, team, status, planned, completed, inProgress, notStarted, orders, sales });

export const repActivityToday: RepDayActivity[] = [
  rep('r01', 'Dara Sok', 'Phnom Penh', 'Visiting', 4, 3, 1, 0, 2, 14200),
  rep('r02', 'Sokha Chan', 'Phnom Penh', 'On Route', 4, 4, 0, 0, 3, 18600),
  rep('r03', 'Vichea Sar', 'Kandal', 'Visiting', 4, 3, 1, 0, 2, 12800),
  rep('r04', 'Rithy Kim', 'Kandal', 'On Route', 3, 3, 0, 0, 1, 7400),
  rep('r05', 'Bopha Lim', 'Siem Reap', 'Visiting', 4, 3, 1, 0, 2, 11900),
  rep('r06', 'Pisey Heng', 'Siem Reap', 'On Route', 3, 3, 0, 0, 2, 13500),
  rep('r07', 'Sophal Meas', 'Battambang', 'Visiting', 3, 2, 1, 0, 1, 6900),
  rep('r08', 'Chenda Ouk', 'Battambang', 'Done', 3, 3, 0, 0, 2, 12600),
  rep('r09', 'Visal Nhem', 'Kampong Cham', 'On Route', 3, 2, 0, 1, 1, 8200),
  rep('r10', 'Kosal Pen', 'Kampong Cham', 'Visiting', 3, 2, 1, 0, 1, 7300),
  rep('r11', 'Mony Tep', 'Sihanoukville', 'Done', 2, 2, 0, 0, 1, 6500),
  rep('r12', 'Sreyneang Hor', 'Sihanoukville', 'On Route', 2, 2, 0, 0, 0, 5500),
  rep('r13', 'Vannak Chea', 'Takeo', 'Not Checked In', 1, 0, 0, 1, 0, 0),
  rep('r14', 'Nary Sim', 'Takeo', 'Not Checked In', 1, 0, 0, 1, 0, 0),
  rep('r15', 'Samnang Yim', 'Kampot', 'Off', 0, 0, 0, 0, 0, 0),
];

/** Figures that do not come from the rep rows. */
export const todayTargets = {
  salesTarget: 153000,
  /** Orders today against the same weekday last week, in percent. */
  ordersTrend: 12,
  pendingQuotations: 4,
};

// ── Period switch ────────────────────────────────────────────────────────────
//
// The dashboard opens on today. The other periods are rebuilt from the same reps,
// seeded per rep and period, so the cards, the visit breakdown and the rep table
// still sum from one set of rows whichever period is chosen.

export const DASHBOARD_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]['value'];

/** Working days in each period (Mon–Sat; the demo date is Friday 7 August). */
const WORKING_DAYS: Record<DashboardPeriod, number> = { today: 1, yesterday: 1, week: 5, month: 6 };

function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let a = h >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { int: (min: number, max: number) => min + Math.floor(rand() * (max - min + 1)), float: (min: number, max: number) => min + rand() * (max - min) };
}

export function repActivityFor(period: DashboardPeriod): RepDayActivity[] {
  if (period === 'today') return repActivityToday;
  const days = WORKING_DAYS[period];
  return repActivityToday.map((r) => {
    const rng = seeded(`${r.id}|${period}`);
    // Someone off today still worked the rest of the week.
    const perDay = Math.max(r.planned, 2);
    const planned = period === 'yesterday' && r.status === 'Off' ? 0 : Math.round(perDay * days * rng.float(0.9, 1.1));
    const missed = planned ? rng.int(0, Math.ceil(planned * 0.15)) : 0;
    const orders = planned ? Math.round(Math.max(r.orders, 1) * days * rng.float(0.7, 1.2)) : 0;
    const avgOrder = r.orders ? r.sales / r.orders : 6500;
    return {
      ...r,
      status: planned ? 'Done' : 'Off',
      planned,
      completed: planned - missed,
      inProgress: 0,
      notStarted: missed,
      orders,
      sales: Math.round((orders * avgOrder * rng.float(0.85, 1.15)) / 100) * 100,
    };
  });
}

export function targetsFor(period: DashboardPeriod) {
  const days = WORKING_DAYS[period];
  return {
    salesTarget: todayTargets.salesTarget * days,
    ordersTrend: period === 'today' ? todayTargets.ordersTrend : seeded(period).int(-6, 15),
  };
}
