/**
 * Who gives the final approval for a depot, and where a registration is right now.
 *
 * ## The matrix
 *
 * Section 7.2 of the credit policy: the lowest level allowed to approve a combination
 * of credit limit (USD) and credit term (days). "Up to" includes the amount and "over"
 * excludes it. A higher level may always approve in place of a lower one.
 *
 * A term between two policy columns is read against the next column up (20 days is
 * treated as 30), so an odd term never lands on a more junior approver than the policy
 * would. Over 90 days, and over $100,000 at 7 or 15 days, the policy defines no level
 * (D-09) — the screens say so instead of guessing.
 *
 * ## Where a registration is
 *
 * The backend lifecycle has three waiting states. They are read as:
 *
 * - `PendingApproval` — with the approver the matrix names.
 * - `RegionManagerApproved` — the RSM (L3) has signed. That is final for an L1–L3
 *   depot; an L4 depot still waits for the NSC.
 * - `SalesManagerApproved` — the top level has signed; only SAP registration is left.
 *
 * This is the portal's reading of those states against the matrix. The server remains
 * the authority on who may approve; these screens only show the route.
 */

export type ApprovalLevel = 1 | 2 | 3 | 4;

export interface LevelInfo {
  level: ApprovalLevel;
  code: string;
  role: string;
  title: string;
  /** Soft cell / pill colours, matching the policy table. */
  tone: string;
  /** Solid accent for dots and rules. */
  dot: string;
}

export const APPROVAL_LEVELS: Record<ApprovalLevel, LevelInfo> = {
  1: { level: 1, code: 'L1', role: 'S.S / ASM', title: 'Sales Supervisor / Area Sales Manager', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-500' },
  2: { level: 2, code: 'L2', role: 'ASM', title: 'Area Sales Manager', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20', dot: 'bg-blue-500' },
  3: { level: 3, code: 'L3', role: 'RSM', title: 'Regional Sales Manager', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25', dot: 'bg-amber-500' },
  4: { level: 4, code: 'L4', role: 'NSC', title: 'National Sales Committee', tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20', dot: 'bg-rose-500' },
};

export const NOT_DEFINED_TONE = 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';

export const TERM_COLUMNS = [7, 15, 30, 45, 60, 90] as const;

export const LIMIT_BANDS = [
  { max: 3_000, label: '≤ 3,000' },
  { max: 5_000, label: '3,001 – 5,000' },
  { max: 10_000, label: '5,001 – 10,000' },
  { max: 20_000, label: '10,001 – 20,000' },
  { max: 50_000, label: '20,001 – 50,000' },
  { max: 100_000, label: '50,001 – 100,000' },
  { max: Number.POSITIVE_INFINITY, label: 'over 100,000' },
] as const;

/** Rows are limit bands, columns are TERM_COLUMNS. `null` is "not defined" (D-09). */
export const APPROVAL_MATRIX: (ApprovalLevel | null)[][] = [
  [1, 1, 2, 3, 3, 4],
  [1, 2, 3, 3, 3, 4],
  [2, 3, 3, 3, 4, 4],
  [3, 3, 3, 3, 4, 4],
  [3, 3, 3, 4, 4, 4],
  [3, 3, 4, 4, 4, 4],
  [null, null, 4, 4, 4, 4],
];

export type RequiredLevel =
  | { kind: 'level'; level: ApprovalLevel; row: number; col: number }
  | { kind: 'not-defined'; row: number; col: number }
  | { kind: 'term-over-policy'; row: number }
  | { kind: 'missing'; missing: 'limit' | 'term' | 'both' };

/** The lowest level that may give final approval for this limit and term. */
export function requiredApproval(
  creditLimit: number | null | undefined,
  creditTermDays: number | null | undefined
): RequiredLevel {
  const hasLimit = creditLimit != null && Number.isFinite(creditLimit);
  const hasTerm = creditTermDays != null && Number.isFinite(creditTermDays);
  if (!hasLimit || !hasTerm) {
    return { kind: 'missing', missing: !hasLimit && !hasTerm ? 'both' : !hasLimit ? 'limit' : 'term' };
  }

  const row = LIMIT_BANDS.findIndex((band) => creditLimit! <= band.max);
  const col = TERM_COLUMNS.findIndex((days) => creditTermDays! <= days);
  if (col === -1) return { kind: 'term-over-policy', row };

  const level = APPROVAL_MATRIX[row][col];
  return level == null ? { kind: 'not-defined', row, col } : { kind: 'level', level, row, col };
}

// ── Where it is ───────────────────────────────────────────────────────────────

export type StepState = 'done' | 'current' | 'upcoming' | 'rejected';

export interface JourneyStep {
  key: 'submitted' | 'approval' | 'sap' | 'active';
  label: string;
  owner: string;
  state: StepState;
  note?: string;
}

export interface Journey {
  steps: JourneyStep[];
  /** One line for a list: where the registration is waiting, and on whom. */
  now: { label: string; owner: string; tone: 'waiting' | 'done' | 'rejected' | 'draft' | 'blocked' };
}

function approverLabel(required: RequiredLevel): string {
  if (required.kind === 'level') {
    const info = APPROVAL_LEVELS[required.level];
    return `${info.code} · ${info.role}`;
  }
  return required.kind === 'missing' ? 'Approver unknown' : 'Not defined by policy';
}

/**
 * The four stops of a registration — submitted, final approval, SAP, trading — with
 * the one it is at marked as current.
 */
export function depotJourney(
  status: string | null | undefined,
  required: RequiredLevel,
  sapRegistered = false
): Journey {
  const approver = approverLabel(required);
  const needsNsc = required.kind === 'level' && required.level === 4;
  const step = (key: JourneyStep['key'], label: string, owner: string, state: StepState, note?: string): JourneyStep => ({
    key, label, owner, state, note,
  });

  const build = (submitted: StepState, approval: StepState, sap: StepState, active: StepState, approvalNote?: string) => [
    step('submitted', 'Submitted', 'Sales Rep', submitted),
    step('approval', 'Final approval', approver, approval, approvalNote),
    step('sap', 'SAP registration', 'System', sap),
    step('active', 'Active', 'Ready to trade', active),
  ];

  switch (status) {
    case 'Draft':
      return {
        steps: build('current', 'upcoming', 'upcoming', 'upcoming'),
        now: { label: 'Not submitted yet', owner: 'Sales Rep', tone: 'draft' },
      };
    case 'PendingApproval':
      return {
        steps: build('done', 'current', 'upcoming', 'upcoming'),
        now: { label: 'Waiting for approval', owner: approver, tone: required.kind === 'level' ? 'waiting' : 'blocked' },
      };
    case 'RegionManagerApproved':
      return needsNsc
        ? {
            steps: build('done', 'current', 'upcoming', 'upcoming', 'Endorsed by RSM'),
            now: { label: 'RSM endorsed · waiting for NSC', owner: approver, tone: 'waiting' },
          }
        : {
            steps: build('done', 'done', 'current', 'upcoming', 'Approved by RSM'),
            now: { label: 'Approved · registering in SAP', owner: 'System', tone: 'waiting' },
          };
    case 'SalesManagerApproved':
      return {
        steps: build('done', 'done', 'current', 'upcoming', 'Approved by Sales Manager'),
        now: { label: 'Approved · registering in SAP', owner: 'System', tone: 'waiting' },
      };
    case 'Active':
      return {
        steps: build('done', 'done', 'done', 'done'),
        now: { label: 'Active', owner: 'Ready to trade', tone: 'done' },
      };
    case 'Rejected':
      return {
        steps: build('done', 'rejected', 'upcoming', 'upcoming'),
        now: { label: 'Rejected', owner: approver, tone: 'rejected' },
      };
    case 'Suspended':
    case 'Closed':
      return {
        steps: build('done', 'done', sapRegistered ? 'done' : 'upcoming', 'rejected'),
        now: { label: status, owner: 'Not trading', tone: 'blocked' },
      };
    default:
      return {
        steps: build('done', 'current', 'upcoming', 'upcoming'),
        now: { label: status || 'Unknown', owner: approver, tone: 'waiting' },
      };
  }
}
