/**
 * Call plan uploads: the CSV template, a tolerant parser, and row validation.
 *
 * The upload is a spreadsheet a sales admin fills in — one row per planned call. Rows
 * are checked against the customers and reps the planner already knows, so a typo in a
 * customer code is caught on the preview instead of becoming a stop nobody can visit.
 */

import { PRIORITIES, type CallPlanItem, type Customer, type Priority, type SalesRep } from '../types';

export const CALL_PLAN_COLUMNS = [
  'customer_code',
  'rep_employee_id',
  'planned_date',
  'time_slot',
  'priority',
  'objective',
  'activities',
] as const;

/** A template with two example rows, so the expected formats are self-explanatory. */
export function callPlanTemplate(customers: Customer[], reps: SalesRep[]): string {
  const c1 = customers[0]?.code ?? 'C010450';
  const c2 = customers[1]?.code ?? 'C010457';
  const r1 = reps[0]?.employeeId ?? 'ISI-1040';
  const today = new Date().toISOString().slice(0, 10);
  return [
    CALL_PLAN_COLUMNS.join(','),
    `${c1},${r1},${today},08:00 - 09:00,High,Monthly stock replenishment,Stock Audit;Order Collection`,
    `${c2},${r1},${today},09:30 - 10:30,Medium,Introduce new roofing profile,Product Pitch;Merchandising`,
  ].join('\n');
}

/** Splits CSV text into rows of cells. Handles quoted cells, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface CallPlanRow {
  line: number;
  values: Record<(typeof CALL_PLAN_COLUMNS)[number], string>;
  errors: string[];
  plan: CallPlanItem | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Turns parsed CSV into checked rows. A row with any error carries `plan: null` and is
 * left out of the import; the rest become Ready call plans.
 */
export function validateCallPlanRows(
  rows: string[][],
  customers: Customer[],
  reps: SalesRep[],
  sourceFile: string
): { rows: CallPlanRow[]; missingColumns: string[] } {
  if (rows.length === 0) return { rows: [], missingColumns: [...CALL_PLAN_COLUMNS] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const missingColumns = CALL_PLAN_COLUMNS.filter((c) => !header.includes(c));
  if (missingColumns.length > 0) return { rows: [], missingColumns };

  const customerByCode = new Map(customers.map((c) => [c.code.toLowerCase(), c]));
  const repByKey = new Map<string, SalesRep>();
  reps.forEach((r) => {
    repByKey.set(r.employeeId.toLowerCase(), r);
    repByKey.set(r.name.toLowerCase(), r);
  });

  const stamp = Date.now().toString().slice(-5);
  const importedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const checked = rows.slice(1).map((cells, index): CallPlanRow => {
    const values = Object.fromEntries(
      CALL_PLAN_COLUMNS.map((c) => [c, (cells[header.indexOf(c)] ?? '').trim()])
    ) as CallPlanRow['values'];
    const errors: string[] = [];

    const customer = customerByCode.get(values.customer_code.toLowerCase());
    if (!values.customer_code) errors.push('Customer code is required');
    else if (!customer) errors.push(`Unknown customer ${values.customer_code}`);

    const rep = repByKey.get(values.rep_employee_id.toLowerCase());
    if (!values.rep_employee_id) errors.push('Sales rep is required');
    else if (!rep) errors.push(`Unknown sales rep ${values.rep_employee_id}`);

    if (!DATE_RE.test(values.planned_date) || Number.isNaN(Date.parse(values.planned_date)))
      errors.push('Date must be YYYY-MM-DD');

    const slot = values.time_slot.replace(/\s*-\s*/, ' - ');
    if (!SLOT_RE.test(values.time_slot)) errors.push('Time slot must be HH:MM - HH:MM');

    const priority = PRIORITIES.find((p) => p.toLowerCase() === values.priority.toLowerCase());
    if (!priority) errors.push(`Priority must be one of ${PRIORITIES.join(', ')}`);

    if (!values.objective) errors.push('Objective is required');

    const activities = values.activities
      .split(/[;|]/)
      .map((a) => a.trim())
      .filter(Boolean);

    const plan: CallPlanItem | null =
      errors.length === 0 && customer && rep
        ? {
            id: `CP-UP-${stamp}-${index + 1}`,
            callPlanNo: `CP-U${stamp}-${String(index + 1).padStart(3, '0')}`,
            customerId: customer.id,
            customerCode: customer.code,
            customerName: customer.name,
            province: customer.province,
            repId: rep.id,
            repName: rep.name,
            plannedDate: values.planned_date,
            timeSlot: slot,
            priority: priority as Priority,
            objective: values.objective,
            activities,
            status: 'Ready',
            importedAt,
            sourceFile,
          }
        : null;

    return { line: index + 2, values, errors, plan };
  });

  return { rows: checked, missingColumns: [] };
}
