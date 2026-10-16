import { crmDepots, repById } from '@/features/depots/data/crm';
import { makeRng } from '@/lib/utilities/random';
import { isoDate } from '@/lib/utilities/demo-clock';
import { salesReps } from '@/features/planning/data/demo-data';

/** Opportunity pipeline: stages, probability weighting and derived metrics. */

export const STAGES = [
  'Lead',
  'Qualified',
  'Needs Analysis',
  'Quotation',
  'Negotiation',
  'Won',
  'Lost',
] as const;
export type Stage = (typeof STAGES)[number];

/** Open stages, in the order the board shows them. */
export const OPEN_STAGES: Stage[] = ['Lead', 'Qualified', 'Needs Analysis', 'Quotation', 'Negotiation'];

/** Default probability per stage — the weighted pipeline depends on it. */
export const STAGE_PROBABILITY: Record<Stage, number> = {
  Lead: 10,
  Qualified: 25,
  'Needs Analysis': 40,
  Quotation: 60,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
};

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Opportunity {
  id: string;
  name: string;
  depotId: string;
  depotName: string;
  stage: Stage;
  value: number;
  probability: number;
  expectedClose: string;
  repId: string;
  priority: Priority;
  lastActivity: string;
  lastActivityAt: string;
  nextAction: string;
  createdAt: string;
  province: string;
}

const DEAL_NAMES = [
  'Q4 reinforcement supply',
  'Roofing package — phase 2',
  'Annual rebar contract',
  'Warehouse structural steel',
  'Residential tower package',
  'Bridge deck reinforcement',
  'Retail branch refit',
  'Cement supply agreement',
  'Pipe and fittings tender',
  'Factory expansion package',
  'School construction supply',
  'Cold-store steel frame',
];

const NEXT_ACTIONS = [
  'Send revised quotation',
  'Site visit to confirm quantities',
  'Follow up on credit approval',
  'Present volume discount',
  'Schedule technical review',
  'Chase purchase order',
  'Confirm delivery schedule',
];

const LAST_ACTIVITIES = [
  'Quotation emailed to purchasing',
  'Site meeting with the project engineer',
  'Call with the owner about lead times',
  'Samples delivered for approval',
  'Price negotiation call',
  'Technical specification shared',
];

function buildOpportunities(): Opportunity[] {
  const rng = makeRng(602144);
  const working = salesReps.filter((r) => r.status !== 'Offline');
  // Every fourth depot carries a deal — enough to fill a board without
  // implying the whole book is in play.
  const pool = crmDepots.filter((_, i) => i % 4 === 0).slice(0, 46);

  return pool.map((depot, i) => {
    const stage = rng.weighted<Stage>([
      ['Lead', 4],
      ['Qualified', 4],
      ['Needs Analysis', 3],
      ['Quotation', 4],
      ['Negotiation', 3],
      ['Won', 4],
      ['Lost', 2],
    ]);
    const closed = stage === 'Won' || stage === 'Lost';
    const rep = working.find((r) => r.province === depot.province) ?? working[i % working.length];

    return {
      id: `OPP-${String(i + 1).padStart(3, '0')}`,
      name: rng.pick(DEAL_NAMES),
      depotId: depot.id,
      depotName: depot.name,
      stage,
      value: rng.int(4, 180) * 1000,
      probability: STAGE_PROBABILITY[stage],
      expectedClose: isoDate(closed ? -rng.int(1, 24) : rng.int(-6, 70)),
      repId: rep.id,
      priority: rng.weighted<Priority>([
        ['Critical', 1],
        ['High', 3],
        ['Medium', 5],
        ['Low', 2],
      ]),
      lastActivity: rng.pick(LAST_ACTIVITIES),
      lastActivityAt: isoDate(-rng.int(0, 15)),
      nextAction: closed ? '—' : rng.pick(NEXT_ACTIONS),
      createdAt: isoDate(-rng.int(20, 220)),
      province: depot.province,
    };
  });
}

export const opportunities: Opportunity[] = buildOpportunities();

export interface PipelineMetrics {
  pipelineValue: number;
  openCount: number;
  weighted: number;
  wonThisMonth: number;
  winRate: number;
  averageDeal: number;
}

export function pipelineMetrics(list: Opportunity[]): PipelineMetrics {
  const open = list.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost');
  const won = list.filter((o) => o.stage === 'Won');
  const lost = list.filter((o) => o.stage === 'Lost');
  const decided = won.length + lost.length;
  const monthStart = isoDate(-31);

  return {
    pipelineValue: open.reduce((sum, o) => sum + o.value, 0),
    openCount: open.length,
    weighted: Math.round(open.reduce((sum, o) => sum + (o.value * o.probability) / 100, 0)),
    wonThisMonth: won
      .filter((o) => o.expectedClose >= monthStart)
      .reduce((sum, o) => sum + o.value, 0),
    winRate: decided ? Math.round((won.length / decided) * 100) : 0,
    averageDeal: won.length ? Math.round(won.reduce((s, o) => s + o.value, 0) / won.length) : 0,
  };
}

export function repName(id: string): string {
  return repById(id)?.name ?? 'Unassigned';
}
