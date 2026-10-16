import { csvBlob } from '@/services/mock';
import type {
  PromotionConditionLeafDto,
  PromotionImportErrorDto,
  PromotionListItemDto,
  PromotionRuleDto,
  PromotionVersionDto,
} from '../api';
import type { ConditionDefinitionDto, PromotionTypeDto } from '../catalog-api';
import { flatten, leaf, type StoredPromotion } from './promotions';

/**
 * The promotion spreadsheet, as CSV.
 *
 * The server's workbook had three joined sheets; a CSV has one, so conditions and tiers
 * travel as compact cells on the promotion's own row:
 *
 * - Conditions: `PaymentMethod In TCOD|TT; Province In PP` — all joined with AND.
 * - Tiers: `10-30=1; 30-=1.5` (from-to=reward, blank to = open-ended), `100-=+2` for
 *   two free pieces.
 *
 * Export writes exactly this shape, so an export can be edited and uploaded back.
 * Lines whose first cell starts with `#` are instructions and are skipped.
 */

export const WORKBOOK_COLUMNS = [
  'Code',
  'Type',
  'Name',
  'Description',
  'Valid from',
  'Valid to',
  'Priority',
  'Stacking',
  'Reward type',
  'Reward value',
  'Currency',
  'Unit',
  'Requires SAP',
  'SAP condition type',
  'Conditions',
  'Tiers',
] as const;

const REWARD_TYPES = ['Percentage', 'FixedAmount', 'FreeItem'];
const STACKING = ['Stackable', 'Exclusive', 'NonStackable'];

export function encodeConditions(conditions: readonly PromotionConditionLeafDto[]): string {
  return conditions.map((c) => `${c.code} ${c.operator} ${c.values.join('|')}`).join('; ');
}

export function encodeTiers(tiers: PromotionVersionDto['tiers']): string {
  return tiers
    .map((t) => {
      const range = `${t.fromQuantity ?? 0}-${t.toQuantity ?? ''}`;
      if (t.freeQuantity) return `${range}=+${t.freeQuantity}`;
      return `${range}=${t.rewardValue ?? ''}`;
    })
    .join('; ');
}

export function workbookRow(item: PromotionListItemDto, version: PromotionVersionDto): (string | number | null)[] {
  return [
    item.code,
    item.businessType,
    version.name,
    version.description ?? '',
    version.validFrom ?? '',
    version.validTo ?? '',
    version.priority ?? '',
    version.stacking ?? '',
    version.rewardType ?? '',
    version.rewardValue ?? '',
    version.currency ?? '',
    version.unit ?? '',
    version.requiresSapSync ? 'Yes' : 'No',
    version.sapConditionType ?? '',
    encodeConditions(version.conditions),
    encodeTiers(version.tiers),
  ];
}

export function templateBlob(): Blob {
  const note = (text: string) => [`# ${text}`, ...Array(WORKBOOK_COLUMNS.length - 1).fill('')];
  return csvBlob(WORKBOOK_COLUMNS, [
    note('One promotion per row. Lines starting with # are ignored — delete the # on an example to use it.'),
    note('Type: a code from Configuration › Types. Dates: YYYY-MM-DD. Reward type: Percentage, FixedAmount or FreeItem.'),
    note('Conditions: "Code Operator v1|v2" joined with ";" — e.g. PaymentMethod In TCOD; Province In PP|KDL. Number conditions: OrderTonnage GreaterOrEqual 25.'),
    note('Tiers: from-to=reward joined with ";" (leave "to" blank on the last), or from-to=+N for N free pieces. Leave Reward value empty when using tiers.'),
    note('An existing code gets a new draft version. Everything imported lands as Draft.'),
    ['#COD-PP-2027', 'PAYMENT_METHOD', 'Phnom Penh COD 1%', 'Cash on delivery in Phnom Penh and Kandal.', '2027-01-01', '2027-12-31', 10, 'Stackable', 'Percentage', 1, '', '', 'Yes', 'ZD01', 'PaymentMethod In TCOD; Province In PP|KDL', ''],
    ['#VOL-WR-2027', 'VOLUME_TIER', 'Wire rod volume ladder', 'Wire rod by the tonne.', '2027-01-01', '2027-06-30', 50, 'Stackable', 'Percentage', '', '', 'tonne', 'Yes', 'ZV01', 'MaterialGroup In CAT-STL-WR', '10-50=1; 50-=2'],
  ]);
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/** RFC 4180-ish: quoted cells, doubled quotes, CRLF or LF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export interface ParsedPromotion {
  row: number;
  code: string;
  businessType: string;
  name: string;
  description: string;
  validFrom: string;
  validTo: string;
  priority: number;
  stacking: string;
  rewardType: string;
  rewardValue: number | null;
  currency: string | null;
  unit: string | null;
  requiresSapSync: boolean;
  sapConditionType: string | null;
  rule: PromotionRuleDto;
  tiers: PromotionVersionDto['tiers'];
}

export interface ParseOutcome {
  totalRows: number;
  rows: ParsedPromotion[];
  errors: PromotionImportErrorDto[];
  created: string[];
  updated: string[];
}

function normaliseDate(value: string): string | null {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return Number.isNaN(Date.parse(v)) ? null : v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/**
 * Checks every row the way the server did, against the live catalogue and the existing
 * promotions. Writes nothing — the caller decides whether to commit.
 */
export function validateWorkbook(
  text: string,
  ctx: { types: PromotionTypeDto[]; conditions: ConditionDefinitionDto[]; promotions: StoredPromotion[] }
): ParseOutcome {
  const grid = parseCsv(text);
  const errors: PromotionImportErrorDto[] = [];
  const rows: ParsedPromotion[] = [];
  const created: string[] = [];
  const updated: string[] = [];

  const header = (grid[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const missing = WORKBOOK_COLUMNS.filter((c) => col(c) === -1 && ['Code', 'Type', 'Name'].includes(c));
  if (missing.length) {
    errors.push({ sheet: 'Promotions', row: 1, code: null, field: 'Header', value: missing.join(', '), message: 'Required columns are missing. Start from the template.' });
    return { totalRows: 0, rows, errors, created, updated };
  }

  const seen = new Set<string>();
  let totalRows = 0;

  grid.forEach((cells, index) => {
    if (index === 0) return;
    const rowNumber = index + 1;
    const get = (name: string) => (col(name) === -1 ? '' : (cells[col(name)] ?? '').trim());
    if (cells.every((c) => c.trim() === '') || get('Code').startsWith('#') || (cells[0] ?? '').trim().startsWith('#')) return;
    totalRows += 1;

    const code = get('Code').toUpperCase();
    const fail = (field: string, message: string, value?: string, sheet = 'Promotions') =>
      errors.push({ sheet, row: rowNumber, code: code || null, field, value: value ?? null, message });
    const before = errors.length;

    if (!code) fail('Code', 'Code is required.');
    else if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) fail('Code', 'Letters, digits, - or _ (2–40).', code);
    else if (seen.has(code)) fail('Code', 'This code appears twice in the file.', code);
    seen.add(code);

    const typeCode = get('Type').toUpperCase();
    const type = ctx.types.find((t) => t.code.toUpperCase() === typeCode);
    if (!type) fail('Type', 'Not a promotion type in the catalogue.', typeCode);
    else if (!type.isActive) fail('Type', 'This type is deactivated.', typeCode);

    const name = get('Name');
    if (!name) fail('Name', 'Name is required.');
    const description = get('Description');
    if (!description) fail('Description', 'Description is required — an approver reads it.');

    const validFrom = normaliseDate(get('Valid from'));
    const validTo = normaliseDate(get('Valid to'));
    if (!validFrom) fail('Valid from', 'Use YYYY-MM-DD.', get('Valid from'));
    if (!validTo) fail('Valid to', 'Use YYYY-MM-DD.', get('Valid to'));
    if (validFrom && validTo && validTo < validFrom) fail('Valid to', 'Ends before it starts.', validTo);

    const priorityText = get('Priority');
    const priority = priorityText === '' ? 10 : Number(priorityText);
    if (!Number.isFinite(priority)) fail('Priority', 'Must be a number.', priorityText);

    const stacking = get('Stacking') || 'Stackable';
    if (!STACKING.includes(stacking)) fail('Stacking', `One of ${STACKING.join(', ')}.`, stacking);

    const rewardType = get('Reward type');
    if (!REWARD_TYPES.includes(rewardType)) fail('Reward type', 'Percentage, FixedAmount or FreeItem.', rewardType);

    // Tiers
    const tiers: PromotionVersionDto['tiers'] = [];
    const tierText = get('Tiers');
    if (tierText) {
      tierText.split(';').map((t) => t.trim()).filter(Boolean).forEach((part, i, all) => {
        const m = part.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)?\s*=\s*(\+)?(\d+(?:\.\d+)?)?$/);
        if (!m) return fail('Tiers', 'Write tiers as from-to=reward, e.g. 10-30=1.', part, 'Tiers');
        const from = Number(m[1]);
        const to = m[2] ? Number(m[2]) : null;
        if (to === null && i !== all.length - 1) return fail('Tiers', 'Only the last tier may be open-ended.', part, 'Tiers');
        if (to !== null && to <= from) return fail('Tiers', '"To" must be above "from".', part, 'Tiers');
        const prev = tiers[tiers.length - 1];
        if (prev && prev.toQuantity != null && from < prev.toQuantity) return fail('Tiers', 'Tiers overlap.', part, 'Tiers');
        tiers.push({
          fromQuantity: from,
          toQuantity: to,
          rewardValue: m[3] ? null : m[4] ? Number(m[4]) : null,
          freeQuantity: m[3] && m[4] ? Number(m[4]) : null,
        });
        return undefined;
      });
    }

    const rewardText = get('Reward value');
    let rewardValue: number | null = null;
    if (rewardText !== '') {
      rewardValue = Number(rewardText);
      if (!Number.isFinite(rewardValue) || rewardValue < 0) fail('Reward value', 'Must be a positive number.', rewardText);
      else if (tierText) fail('Reward value', 'Leave empty when the promotion has tiers.', rewardText);
      else if (rewardType === 'Percentage' && rewardValue > 100) fail('Reward value', 'A percentage cannot exceed 100.', rewardText);
    } else if (!tierText && rewardType !== 'FreeItem') fail('Reward value', 'Give a reward value or tiers.');
    if (rewardType === 'FreeItem' && !tierText) fail('Tiers', 'A free-item promotion needs at least one tier.', undefined, 'Tiers');

    const requiresSapSync = !/^(no|n|false|0)$/i.test(get('Requires SAP') || 'yes');
    const sapConditionType = get('SAP condition type').toUpperCase() || null;
    if (requiresSapSync && (!sapConditionType || sapConditionType.length !== 4))
      fail('SAP condition type', 'Four characters, required when SAP sync is on.', sapConditionType ?? '');

    // Conditions
    const leaves: PromotionConditionLeafDto[] = [];
    get('Conditions').split(';').map((c) => c.trim()).filter(Boolean).forEach((part) => {
      const m = part.match(/^(\S+)\s+(\S+)\s+(.+)$/);
      if (!m) return fail('Conditions', 'Write a condition as "Code Operator value|value".', part, 'Conditions');
      const def = ctx.conditions.find((d) => d.code.toUpperCase() === m[1].toUpperCase());
      if (!def) return fail('Conditions', 'Not a condition in the catalogue.', m[1], 'Conditions');
      if (!def.isActive) return fail('Conditions', 'This condition was deactivated.', def.code, 'Conditions');
      const op = def.operators.find((o) => o.toUpperCase() === m[2].toUpperCase());
      if (!op) return fail('Conditions', `Operator must be one of ${def.operators.join(', ')}.`, m[2], 'Conditions');
      const values = m[3].split('|').map((v) => v.trim().toUpperCase()).filter(Boolean);
      if (def.valueType === 'Number') {
        const need = op === 'Between' ? 2 : 1;
        if (values.length !== need || values.some((v) => !Number.isFinite(Number(v))))
          return fail('Conditions', need === 2 ? 'Give a low and a high number.' : 'Give one number.', m[3], 'Conditions');
      }
      const allowed = def.valueSource === 'Static' ? def.values.filter((v) => v.isActive).map((v) => v.value.toUpperCase()) : [];
      const bad = allowed.length ? values.filter((v) => !allowed.includes(v)) : [];
      if (bad.length) return fail('Conditions', `Not in ${def.name}'s list.`, bad.join(', '), 'Conditions');
      leaves.push(leaf(def.code, op, values));
      return undefined;
    });

    const existing = ctx.promotions.find((p) => p.code.toUpperCase() === code);
    if (existing) {
      const latest = existing.versions[existing.versions.length - 1];
      if (latest.isNestedRule) fail('Code', 'Uses a nested rule or links — edit it in the portal.', code);
      else if (['UnderCommercialReview', 'UnderFinanceReview', 'Approved'].includes(latest.status))
        fail('Code', `v${latest.versionNumber} is ${latest.status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} — finish or cancel it first.`, code);
    }

    if (errors.length > before) return;
    (existing ? updated : created).push(code);
    rows.push({
      row: rowNumber,
      code,
      businessType: type!.code,
      name,
      description,
      validFrom: validFrom!,
      validTo: validTo!,
      priority,
      stacking,
      rewardType,
      rewardValue: tierText ? null : rewardValue,
      currency: rewardType === 'FixedAmount' ? get('Currency').toUpperCase() || 'USD' : null,
      unit: get('Unit') || null,
      requiresSapSync,
      sapConditionType: requiresSapSync ? sapConditionType : null,
      rule: { operator: 'And', conditions: leaves, groups: [] },
      tiers,
    });
  });

  return { totalRows, rows, errors, created, updated };
}

export function errorReportBlob(errors: readonly PromotionImportErrorDto[]): Blob {
  return csvBlob(
    ['Sheet', 'Row', 'Promotion', 'Column', 'Value', 'Problem'],
    errors.map((e) => [e.sheet, e.row, e.code ?? '', e.field, e.value ?? '', e.message])
  );
}

export { flatten };
