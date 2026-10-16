/**
 * Bulk depot assignment by spreadsheet — mock of `AdminDepotAssignmentsController`.
 *
 * ## What an assignment is here
 *
 * Putting a depot on a representative's day for a date writes the same call-plan rows
 * the planning board writes. It is **not** a change of depot ownership — which
 * representative holds the relationship with a customer is a separate field the import
 * never touches.
 *
 * ## Read `imported`, never the counts
 *
 * The import is all-or-nothing. `successfulRows` means "rows that passed validation",
 * and when `imported` is false **none of them were saved** — so a screen that reported
 * "94 successful" off a refused import would tell somebody 94 assignments exist when
 * none do.
 *
 * ## In the prototype
 *
 * CSV files are parsed and validated in the browser against the planning module's
 * representatives and the CRM depot master. There is no spreadsheet reader bundled, so
 * an `.xlsx` is read as a deterministic sample of plausible rows derived from the file —
 * the same file always gives the same result, and the error report agrees with it.
 */
import { z } from 'zod';
import { createPersistentStore, csvBlob, fileStamp, mockDelay } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import { makeRng } from '@/lib/utilities/random';
import { crmDepots } from '@/features/depots/data/crm';
import { salesReps } from '@/features/planning/data/demo-data';
import { callPlansStore } from '@/features/planning/data/mock-db';
import type { CallPlanItem } from '@/features/planning/types';
import { REGION_CODES, depotsByCode, repsByCode } from './data/directory';

export const ImportErrorSchema = z.object({
  row: z.number(),
  assignmentDate: z.string().nullable().optional(),
  salesRepCode: z.string().nullable().optional(),
  salesRepName: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  depotName: z.string().nullable().optional(),
  regionCode: z.string().nullable().optional(),
  message: z.string(),
});

export const ImportResultSchema = z.object({
  totalRows: z.number().default(0),
  successfulRows: z.number().default(0),
  failedRows: z.number().default(0),
  imported: z.boolean().default(false),
  routesCreated: z.number().default(0),
  stopsCreated: z.number().default(0),
  errors: z.array(ImportErrorSchema).default([]),
});

export type ImportErrorDto = z.infer<typeof ImportErrorSchema>;
export type ImportResultDto = z.infer<typeof ImportResultSchema>;

// Moved to lib/utilities when promotions needed the same save. Re-exported so the
// existing import path keeps working and the implementation stays in one place.
export { saveBlob };

/** One saved assignment: a depot on a representative's route for a date. */
export interface DepotAssignment {
  id: string;
  date: string;
  repId: string;
  depotId: string;
  importedAt: string;
  sourceFile: string;
}

const assignmentsStore = createPersistentStore<DepotAssignment[]>('depot-assignments.records', () => []);

const TEMPLATE_HEADERS = [
  'Assignment Date (YYYY-MM-DD)',
  'Sales Rep Code',
  'Sales Rep Name',
  'Depot Code',
  'Depot Name',
  'Region Code',
] as const;

/** How far ahead a file may plan. Further out than this is almost always a typo in the year. */
const HORIZON_DAYS = 90;

interface RawRow {
  row: number;
  assignmentDate: string;
  salesRepCode: string;
  salesRepName: string;
  depotCode: string;
  depotName: string;
  regionCode: string;
}

// --- Reading the file -------------------------------------------------------

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF. */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const text = content.replace(/^﻿/, '');

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Finds each column by what its header says, so a reordered sheet still reads. */
function columnIndex(header: string[]) {
  const norm = header.map((h) => h.trim().toLowerCase());
  const find = (...tests: Array<(h: string) => boolean>) => norm.findIndex((h) => tests.every((t) => t(h)));
  return {
    date: find((h) => h.includes('date')),
    repCode: find((h) => h.includes('rep') || h.includes('sales'), (h) => h.includes('code') || h.includes('id')),
    repName: find((h) => h.includes('rep') || h.includes('sales'), (h) => h.includes('name')),
    depotCode: find((h) => h.includes('depot') || h.includes('customer'), (h) => h.includes('code') || h.includes('id')),
    depotName: find((h) => h.includes('depot') || h.includes('customer'), (h) => h.includes('name')),
    region: find((h) => h.includes('region') || h.includes('province')),
  };
}

function rowsFromCsv(content: string): RawRow[] {
  const table = parseCsv(content);
  const headerAt = table.findIndex((r) => r.some((c) => c.trim()));
  if (headerAt < 0) return [];
  const col = columnIndex(table[headerAt]);
  if (col.date < 0 || col.repCode < 0 || col.depotCode < 0) {
    throw new Error('The header row is not the template’s — it needs Assignment Date, Sales Rep Code and Depot Code columns.');
  }
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');

  return table
    .slice(headerAt + 1)
    .map((r, i) => ({ r, row: headerAt + i + 2 }))
    .filter(({ r }) => r.some((c) => c.trim()))
    .map(({ r, row }) => ({
      row,
      assignmentDate: at(r, col.date),
      salesRepCode: at(r, col.repCode),
      salesRepName: at(r, col.repName),
      depotCode: at(r, col.depotCode),
      depotName: at(r, col.depotName),
      regionCode: at(r, col.region),
    }));
}

function addDays(date: Date, days: number): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Next `count` working days (Mon–Sat), starting tomorrow. */
function workingDays(count: number): string[] {
  const out: string[] = [];
  for (let i = 1; out.length < count; i += 1) {
    const iso = addDays(new Date(), i);
    if (new Date(`${iso}T00:00:00Z`).getUTCDay() !== 0) out.push(iso);
  }
  return out;
}

/**
 * An .xlsx cannot be read without a spreadsheet library, so the prototype derives a
 * sample from the file: representatives visiting active depots in their own province
 * over the coming week. Seeded on name and size, so re-uploading the same file — or
 * asking for its error report — sees the same rows.
 */
function rowsFromWorkbook(file: File): RawRow[] {
  const seed = Array.from(file.name).reduce((a, ch) => a * 31 + ch.charCodeAt(0), file.size) >>> 0;
  const rng = makeRng(seed);
  const count = Math.min(60, Math.max(8, Math.round(file.size / 400)));
  const days = workingDays(5);
  const reps = salesReps.filter((r) => r.status !== 'Offline');
  const rows: RawRow[] = [];

  for (let i = 0; rows.length < count && i < count * 4; i += 1) {
    const rep = rng.pick(reps);
    const pool = crmDepots.filter((d) => d.province === rep.province && d.status !== 'Inactive');
    if (!pool.length) continue;
    const depot = rng.pick(pool);
    rows.push({
      row: rows.length + 2,
      assignmentDate: rng.pick(days),
      salesRepCode: rep.employeeId,
      salesRepName: rep.name,
      depotCode: depot.code,
      depotName: depot.name,
      regionCode: REGION_CODES[depot.province] ?? '',
    });
  }
  return rows;
}

async function readRows(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return rowsFromCsv(await file.text());
  if (name.endsWith('.xlsx')) return rowsFromWorkbook(file);
  throw new Error('Only .csv and .xlsx files can be imported.');
}

// --- Validation ---------------------------------------------------------------

/** Accepts the template's YYYY-MM-DD and the DD/MM/YYYY Excel tends to produce. */
function normaliseDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!y) return null;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCMonth() !== Number(m) - 1) return null;
  return date.toISOString().slice(0, 10);
}

interface ValidRow {
  raw: RawRow;
  date: string;
  repId: string;
  depotId: string;
}

function validate(rows: RawRow[]) {
  const errors: ImportErrorDto[] = [];
  const valid: ValidRow[] = [];
  const today = addDays(new Date(), 0);
  const horizon = addDays(new Date(), HORIZON_DAYS);
  const existing = assignmentsStore.get();
  const seen = new Map<string, number>();
  const perDay = new Map<string, number>();
  existing.forEach((a) => perDay.set(`${a.repId}|${a.date}`, (perDay.get(`${a.repId}|${a.date}`) ?? 0) + 1));

  for (const raw of rows) {
    const rep = repsByCode.get(raw.salesRepCode.toUpperCase());
    const depot = depotsByCode.get(raw.depotCode.toUpperCase());
    const date = normaliseDate(raw.assignmentDate);
    // Errors carry the names the system knows, so a typo'd code is still recognisable.
    const enriched = {
      ...raw,
      salesRepName: raw.salesRepName || rep?.name || '',
      depotName: raw.depotName || depot?.name || '',
    };

    let message: string | null = null;
    if (!raw.assignmentDate) message = 'Assignment date is blank.';
    else if (!date) message = `“${raw.assignmentDate}” is not a date — use YYYY-MM-DD.`;
    else if (date < today) message = 'The date is in the past.';
    else if (date > horizon) message = `The date is more than ${HORIZON_DAYS} days ahead.`;
    else if (!raw.salesRepCode) message = 'Sales rep code is blank.';
    else if (!rep) message = `No sales representative has the code ${raw.salesRepCode}.`;
    else if (raw.salesRepName && raw.salesRepName.toLowerCase() !== rep.name.toLowerCase())
      message = `${raw.salesRepCode} is ${rep.name}, not ${raw.salesRepName}.`;
    else if (!raw.depotCode) message = 'Depot code is blank.';
    else if (!depot) message = `No depot has the code ${raw.depotCode}.`;
    else if (depot.status === 'Inactive') message = `${depot.name} is inactive and cannot be visited.`;
    else if (raw.regionCode && raw.regionCode.toUpperCase() !== REGION_CODES[depot.province])
      message = `${depot.name} is in ${depot.province} (${REGION_CODES[depot.province]}), not ${raw.regionCode}.`;

    if (!message && rep && depot && date) {
      const key = `${rep.id}|${depot.id}|${date}`;
      const dayKey = `${rep.id}|${date}`;
      if (seen.has(key)) message = `Duplicate of row ${seen.get(key)}.`;
      else if (existing.some((a) => a.repId === rep.id && a.depotId === depot.id && a.date === date))
        message = `${depot.name} is already on ${rep.name}’s route for ${date}.`;
      else if ((perDay.get(dayKey) ?? 0) >= rep.capacity)
        message = `${rep.name} already has ${rep.capacity} calls on ${date} — the daily capacity.`;
      else {
        seen.set(key, raw.row);
        perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1);
        valid.push({ raw, date, repId: rep.id, depotId: depot.id });
        continue;
      }
    }
    errors.push({ ...enriched, message: message ?? 'The row could not be read.' });
  }

  return { valid, errors };
}

/** Same check as the import, without writing — what the error report is built from. */
async function dryRun(file: File) {
  const rows = await readRows(file);
  return { rows, ...validate(rows) };
}

function toCallPlans(rows: ValidRow[], fileName: string, importedAt: string): CallPlanItem[] {
  const slots = ['08:00 - 09:00', '09:15 - 10:15', '10:30 - 11:30', '13:30 - 14:30', '14:45 - 15:45', '16:00 - 17:00'];
  const slotCounter = new Map<string, number>();
  const base = Date.now().toString(36).slice(-4).toUpperCase();

  return rows.map((r, i) => {
    const rep = repsByCode.get(r.repId)!;
    const depot = depotsByCode.get(r.depotId)!;
    const dayKey = `${r.repId}|${r.date}`;
    const n = slotCounter.get(dayKey) ?? 0;
    slotCounter.set(dayKey, n + 1);
    return {
      id: `CP-IMP-${base}-${String(i + 1).padStart(4, '0')}`,
      callPlanNo: `CP-${base}${String(i + 1).padStart(3, '0')}`,
      customerId: depot.id,
      customerCode: depot.code,
      customerName: depot.name,
      province: depot.province,
      repId: rep.id,
      repName: rep.name,
      plannedDate: r.date,
      timeSlot: slots[n % slots.length],
      priority: depot.tier === 'Platinum' ? 'High' : 'Medium',
      objective: 'Depot call from bulk assignment',
      activities: ['Stock Audit', 'Order Collection'],
      status: 'Committed',
      importedAt,
      sourceFile: fileName,
    };
  });
}

export const depotAssignmentsApi = {
  /**
   * Downloads the template.
   *
   * Built from the current representatives and depots, with a handful of filled
   * example rows for the coming week that would import as they stand.
   */
  downloadTemplate: async (signal?: AbortSignal) => {
    await mockDelay(350, signal);
    const days = workingDays(3);
    const reps = salesReps.filter((r) => r.status !== 'Offline').slice(0, 4);
    const examples = reps.flatMap((rep, i) =>
      crmDepots
        .filter((d) => d.province === rep.province && d.status === 'Active')
        .slice(i * 2, i * 2 + 2)
        .map((d) => [days[i % days.length], rep.employeeId, rep.name, d.code, d.name, REGION_CODES[d.province] ?? ''])
    );
    saveBlob(csvBlob(TEMPLATE_HEADERS, examples), `depot-assignments-template-${fileStamp()}.csv`);
  },

  /** Validates the whole file and, only if every row passes, saves it. */
  import: async (file: File, signal?: AbortSignal): Promise<ImportResultDto> => {
    const rows = await readRows(file);
    // Proportional to the file, as the real resolve-and-walk was.
    await mockDelay(Math.min(2400, 600 + rows.length * 12), signal);
    if (rows.length === 0) throw new Error('The file has no data rows under the header.');

    const { valid, errors } = validate(rows);
    const imported = errors.length === 0;
    let routesCreated = 0;

    if (imported) {
      const importedAt = new Date().toISOString();
      const before = new Set(assignmentsStore.get().map((a) => `${a.repId}|${a.date}`));
      routesCreated = new Set(valid.map((v) => `${v.repId}|${v.date}`).filter((k) => !before.has(k))).size;
      assignmentsStore.update((all) => [
        ...all,
        ...valid.map((v, i) => ({
          id: `ASG-${Date.now().toString(36)}-${i}`,
          date: v.date,
          repId: v.repId,
          depotId: v.depotId,
          importedAt,
          sourceFile: file.name,
        })),
      ]);
      // The same rows the planning board writes, so the calendar shows them.
      const plans = toCallPlans(valid, file.name, importedAt.slice(0, 16).replace('T', ' '));
      callPlansStore.update((all) => [...all, ...plans]);
    }

    return {
      totalRows: rows.length,
      successfulRows: valid.length,
      failedRows: errors.length,
      imported,
      routesCreated,
      stopsCreated: imported ? valid.length : 0,
      errors,
    };
  },

  /**
   * Downloads the failed rows as CSV.
   *
   * Re-validates the same file as a dry run, so asking for the report can never import
   * anything as a side effect.
   */
  downloadErrorReport: async (file: File, signal?: AbortSignal) => {
    const { errors } = await dryRun(file);
    await mockDelay(300, signal);
    const base = file.name.replace(/\.[^.]+$/, '');
    saveBlob(
      csvBlob(
        ['Row', ...TEMPLATE_HEADERS, 'Problem'],
        errors.map((e) => [e.row, e.assignmentDate, e.salesRepCode, e.salesRepName, e.depotCode, e.depotName, e.regionCode, e.message])
      ),
      `${base}-errors-${fileStamp()}.csv`
    );
  },

  /** Everything imported so far, for screens that want to show it. */
  listAssignments: async (signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    return assignmentsStore.get();
  },
};
