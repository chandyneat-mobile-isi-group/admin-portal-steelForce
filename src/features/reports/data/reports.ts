import { crmDepots } from '@/features/depots/data/crm';
import { opportunities } from '@/features/opportunities/data/pipeline';
import { makeRng } from '@/lib/utilities/random';
import { salesReps } from '@/features/planning/data/demo-data';
import { PROVINCES } from '@/features/planning/types';
import { rootCategories, categoryRollup } from '@/features/materials/data/catalog';

/**
 * Reporting aggregates.
 *
 * Everything here is derived from the same customers, reps and opportunities
 * the operational screens use, so a number in a report can be traced back to
 * rows a manager can actually open.
 */

export interface RepPerformance {
  repId: string;
  name: string;
  team: string;
  province: string;
  target: number;
  actual: number;
  achievement: number;
  orders: number;
  growth: number;
  customers: number;
  plannedVisits: number;
  completedVisits: number;
  missedVisits: number;
  completionRate: number;
  uniqueCustomers: number;
  avgVisitMinutes: number;
  opportunities: number;
  won: number;
  winRate: number;
  pipeline: number;
  status: 'Excellent' | 'On Track' | 'Needs Attention' | 'At Risk';
}

function performanceStatus(achievement: number): RepPerformance['status'] {
  if (achievement >= 110) return 'Excellent';
  if (achievement >= 92) return 'On Track';
  if (achievement >= 78) return 'Needs Attention';
  return 'At Risk';
}

function buildPerformance(): RepPerformance[] {
  const rng = makeRng(551903);

  return salesReps.map((rep) => {
    const target = rng.int(40, 130) * 1000;
    const achievement = rng.int(62, 128);
    const actual = Math.round((target * achievement) / 100);

    const planned = rng.int(52, 104);
    const missed = rng.int(2, 16);
    const completed = planned - missed;

    const repOpps = opportunities.filter((o) => o.repId === rep.id);
    const won = repOpps.filter((o) => o.stage === 'Won').length;
    const lost = repOpps.filter((o) => o.stage === 'Lost').length;
    const open = repOpps.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost');

    return {
      repId: rep.id,
      name: rep.name,
      team: rep.team,
      province: rep.province,
      target,
      actual,
      achievement,
      orders: rng.int(18, 96),
      growth: rng.int(-14, 38),
      customers: crmDepots.filter((c) => c.repId === rep.id).length,
      plannedVisits: planned,
      completedVisits: completed,
      missedVisits: missed,
      completionRate: Math.round((completed / planned) * 100),
      uniqueCustomers: rng.int(18, 62),
      avgVisitMinutes: rng.int(24, 58),
      opportunities: repOpps.length,
      won,
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      pipeline: open.reduce((sum, o) => sum + o.value, 0),
      status: performanceStatus(achievement),
    };
  });
}

export const repPerformance: RepPerformance[] = buildPerformance();

export const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

export interface TrendPoint {
  month: string;
  sales: number;
  target: number;
}

function buildTrend(): TrendPoint[] {
  const rng = makeRng(20260807);
  let base = 210_000;
  return MONTHS.map((month) => {
    base = Math.round(base * rng.float(0.94, 1.11));
    return { month, sales: base, target: Math.round(base * rng.float(0.88, 1.14)) };
  });
}

export const salesTrend: TrendPoint[] = buildTrend();

export const salesByProvince = PROVINCES.map((province) => {
  const inProvince = repPerformance.filter((r) => r.province === province);
  const customers = crmDepots.filter((c) => c.province === province);
  return {
    province,
    short: province === 'Phnom Penh' ? 'PP' : province.split(' ')[0],
    sales: inProvince.reduce((sum, r) => sum + r.actual, 0),
    customers: customers.length,
  };
}).filter((row) => row.sales > 0);

export const salesByCategory = rootCategories.map((root) => {
  const rollup = categoryRollup(root);
  return { category: root.name, revenue: Math.round(rollup.revenue) };
});

export const topCustomers = [...crmDepots]
  .sort((a, b) => b.salesValue - a.salesValue)
  .slice(0, 8)
  .map((c) => ({
    id: c.id,
    name: c.name,
    province: c.province,
    revenue: c.salesValue,
    orders: Math.max(1, Math.round(c.totalVisits / 3)),
  }));

/** Visits per weekday, for the visit report's activity chart. */
export const visitsByDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
  const rng = makeRng(4400 + i);
  const planned = rng.int(48, 96);
  const completed = planned - rng.int(3, 18);
  return { day, planned, completed };
});

export interface SalesTotals {
  totalSales: number;
  target: number;
  achievement: number;
  growth: number;
  orders: number;
  averageOrder: number;
  grossMargin: number;
}

export function salesTotals(rows: RepPerformance[]): SalesTotals {
  const totalSales = rows.reduce((sum, r) => sum + r.actual, 0);
  const target = rows.reduce((sum, r) => sum + r.target, 0);
  const orders = rows.reduce((sum, r) => sum + r.orders, 0);
  return {
    totalSales,
    target,
    achievement: target ? Math.round((totalSales / target) * 100) : 0,
    growth: rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.growth, 0) / rows.length)
      : 0,
    orders,
    averageOrder: orders ? Math.round(totalSales / orders) : 0,
    grossMargin: 23,
  };
}

export interface VisitTotals {
  total: number;
  completed: number;
  planned: number;
  missed: number;
  completionRate: number;
  uniqueCustomers: number;
}

export function visitTotals(rows: RepPerformance[]): VisitTotals {
  const planned = rows.reduce((sum, r) => sum + r.plannedVisits, 0);
  const completed = rows.reduce((sum, r) => sum + r.completedVisits, 0);
  const missed = rows.reduce((sum, r) => sum + r.missedVisits, 0);
  return {
    total: planned,
    completed,
    planned: planned - completed - missed,
    missed,
    completionRate: planned ? Math.round((completed / planned) * 100) : 0,
    uniqueCustomers: rows.reduce((sum, r) => sum + r.uniqueCustomers, 0),
  };
}

/** Twelve-month sales trend for one rep, used in the performance drawer. */
export function repTrend(repId: string): TrendPoint[] {
  const seed = repId.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) * 17;
  const rng = makeRng(seed);
  const perf = repPerformance.find((r) => r.repId === repId);
  let base = (perf?.actual ?? 60_000) / 12;
  return MONTHS.map((month) => {
    base = Math.round(base * rng.float(0.86, 1.16));
    return { month, sales: base, target: Math.round((perf?.target ?? 70_000) / 12) };
  });
}

// ── Reporting periods ────────────────────────────────────────────────────────
//
// `repPerformance` holds trailing-12-month sales and a month of visits. The
// period filters rescale those rows deterministically (seeded per rep and
// period), so switching period changes every figure on the page and switching
// back restores the same numbers.

/** Days covered by each period filter value; 'All' is the account's whole history. */
const PERIOD_DAYS: Record<string, number> = { '7': 7, '30': 30, '90': 90, '365': 365, All: 876 };

/** Share of planned visits still ahead in an in-progress period (demo date is a Friday, 7 Aug). */
const UPCOMING_SHARE: Record<string, number> = { '7': 0.14, '30': 0.2, '90': 0.1 };

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function periodDays(period: string): number {
  return PERIOD_DAYS[period] ?? 365;
}

/**
 * Rescales rep rows to a period. `kind` says which figures are the baseline:
 * sales rows are trailing-12-month, visit rows are one month.
 */
export function rowsForPeriod(rows: RepPerformance[], period: string, kind: 'sales' | 'visits'): RepPerformance[] {
  if (kind === 'sales' && period === '365') return rows;
  const days = periodDays(period);
  const fSales = days / 365;
  const fVisits = days / 30;
  const upcomingShare = kind === 'visits' ? UPCOMING_SHARE[period] ?? 0 : 0;

  return rows.map((r) => {
    const rng = makeRng(hashSeed(`${r.repId}|${period}|${kind}`));
    const achievement = Math.max(45, Math.min(140, r.achievement + rng.int(-14, 14)));
    const target = Math.max(100, Math.round((r.target * fSales) / 100) * 100);
    const planned = Math.max(1, Math.round(r.plannedVisits * fVisits * rng.float(0.9, 1.1)));
    const missed = Math.min(planned, Math.round(r.missedVisits * fVisits * rng.float(0.7, 1.3)));
    const upcoming = Math.round((planned - missed) * upcomingShare);
    const completed = planned - missed - upcoming;
    return {
      ...r,
      target,
      actual: Math.round((target * achievement) / 100),
      achievement,
      orders: Math.max(0, Math.round(r.orders * fSales * rng.float(0.85, 1.15))),
      growth: r.growth + rng.int(-8, 8),
      plannedVisits: planned,
      completedVisits: completed,
      missedVisits: missed,
      completionRate: Math.round((completed / Math.max(1, completed + missed)) * 100),
      uniqueCustomers: Math.max(1, Math.min(completed, Math.round(r.uniqueCustomers * Math.min(1.8, Math.sqrt(fVisits))))),
      avgVisitMinutes: Math.max(15, r.avgVisitMinutes + rng.int(-4, 4)),
      status: performanceStatus(achievement),
    };
  });
}

/** Fraction of total team sales the filtered rows represent. */
export function salesShare(rows: RepPerformance[]): number {
  const all = repPerformance.reduce((sum, r) => sum + r.actual, 0);
  return all ? rows.reduce((sum, r) => sum + r.actual, 0) / all : 0;
}

/** Sales-versus-target trend for a period: weeks for 30 days, months otherwise. */
export function salesTrendFor(period: string, share: number): TrendPoint[] {
  const scale = (p: TrendPoint): TrendPoint => ({ ...p, sales: Math.round(p.sales * share), target: Math.round(p.target * share) });
  if (period === '30') {
    const last = salesTrend[salesTrend.length - 1];
    const rng = makeRng(3007);
    const weights = [0, 1, 2, 3].map(() => rng.float(0.85, 1.15));
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map((w, i) =>
      scale({ month: `Wk ${i + 1}`, sales: Math.round((last.sales * w) / total), target: Math.round(last.target / 4) })
    );
  }
  if (period === '90') return salesTrend.slice(-3).map(scale);
  return salesTrend.map(scale);
}

export function salesByProvinceFor(rows: RepPerformance[]) {
  return PROVINCES.map((province) => {
    const inProvince = rows.filter((r) => r.province === province);
    return {
      province,
      short: province === 'Phnom Penh' ? 'PP' : province.split(' ')[0],
      sales: inProvince.reduce((sum, r) => sum + r.actual, 0),
      customers: crmDepots.filter((c) => c.province === province && inProvince.some((r) => r.repId === c.repId)).length,
    };
  }).filter((row) => row.sales > 0);
}

export function salesByCategoryFor(period: string, share: number) {
  const f = periodDays(period) / 365;
  return salesByCategory.map((c) => ({ ...c, revenue: Math.round(c.revenue * share * f) }));
}

export function topCustomersFor(repIds: readonly string[], period: string) {
  const f = periodDays(period) / 365;
  const reps = new Set(repIds);
  return crmDepots
    .filter((c) => reps.has(c.repId))
    .sort((a, b) => b.salesValue - a.salesValue)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name,
      province: c.province,
      revenue: Math.round(c.salesValue * f),
      orders: Math.max(1, Math.round((c.totalVisits / 3) * Math.min(2.4, f))),
    }));
}

/** The weekday visit pattern, sized to the visits of the reps and period in scope. */
export function visitsByDayFor(rows: RepPerformance[]) {
  const planned = rows.reduce((s, r) => s + r.plannedVisits, 0);
  const completed = rows.reduce((s, r) => s + r.completedVisits, 0);
  const missed = rows.reduce((s, r) => s + r.missedVisits, 0);
  const baseMissed = visitsByDay.reduce((s, d) => s + d.planned - d.completed, 0);
  const basePlanned = visitsByDay.reduce((s, d) => s + d.planned, 0);
  const baseCompleted = visitsByDay.reduce((s, d) => s + d.completed, 0);
  return visitsByDay.map((d) => {
    const dayPlanned = Math.round((planned * d.planned) / basePlanned);
    const dayCompleted = Math.min(dayPlanned, Math.round((completed * d.completed) / baseCompleted));
    const dayMissed = Math.min(dayPlanned - dayCompleted, Math.round((missed * (d.planned - d.completed)) / Math.max(1, baseMissed)));
    return { day: d.day, planned: dayPlanned, completed: dayCompleted, missed: dayMissed };
  });
}
