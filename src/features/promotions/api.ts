/**
 * Promotions and discounts — the service the pages call, backed by the prototype's local
 * mock store (`./data`). Same contract the `PromotionsController` endpoints had.
 *
 * ## What this feature is
 *
 * A **rule engine**. Every discount the business gives is a promotion row rather than
 * code: conditions, a reward, validity, priority, stacking and a SAP mapping. Commercial
 * and Finance author them and take them through a two-stage approval before they go live.
 *
 * This replaced the depot-agreement pipeline — request, four signatures, immutable term,
 * SAP condition task. Those endpoints no longer exist.
 *
 * ## The lifecycle, and why the screen has to show two things at once
 *
 * A promotion is a container; its content lives on **versions**. Editing a live discount
 * creates a new version rather than changing what was approved, so a promotion can have a
 * live version and an open one being worked on at the same time. That is why the list
 * carries both `status` (the open version's) and `liveVersionNumber` — showing only one
 * tells somebody a promotion is Draft when customers are being charged under it today.
 *
 * `Draft → UnderCommercialReview → UnderFinanceReview → Approved → Active`, with
 * `Rejected`, `Cancelled`, `Deactivated` and `Superseded` as exits.
 *
 * ## Approval is not activation
 *
 * Finance approving a version does not price anything. `activate` does, and it is a
 * separate call and a separate permission. Conflating them on screen is how a discount
 * nobody switched on is reported as being given.
 */
import { z } from 'zod';
import { clone, csvBlob, fileStamp, mockDelay, mockId, mockResolve } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import { categoryMappings } from './data/catalog';
import { flatten, isNested, type StoredPromotion } from './data/promotions';
import {
  conditionStore,
  currentUserName,
  nowIso,
  promotionError,
  promotionStore,
  promotionTypeStore,
} from './data/store';
import { errorReportBlob, templateBlob, validateWorkbook, workbookRow, WORKBOOK_COLUMNS } from './data/workbook';

/**
 * The label for a promotion's type.
 *
 * Types are catalogue data now (`promotion-types`), so there is no list to look up here:
 * the server sends `businessTypeName`, and a type since removed from the catalogue
 * falls back to its raw code.
 */
export function typeLabel(row: { businessType: string; businessTypeName?: string | null }): string {
  return row.businessTypeName || row.businessType;
}

/** Every state a version can be in, in lifecycle order. */
export const PROMOTION_STATUSES = [
  'Draft',
  'UnderCommercialReview',
  'UnderFinanceReview',
  'Approved',
  'Active',
  'Rejected',
  'Cancelled',
  'Deactivated',
  'Superseded',
  'Expired',
] as const;

/** The states that mean somebody still has to sign. Drives the approval queue. */
export const AWAITING_SIGNATURE = ['UnderCommercialReview', 'UnderFinanceReview'] as const;

export const PromotionListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  businessType: z.string(),
  businessTypeName: z.string().nullable().optional(),
  rewardType: z.string().nullable().optional(),
  rewardValue: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  versionNumber: z.number().nullable().optional(),
  status: z.string(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  stacking: z.string().nullable().optional(),
  sapConditionType: z.string().nullable().optional(),
  sapStatus: z.string().nullable().optional(),
  liveVersionNumber: z.number().nullable().optional(),
  openVersionNumber: z.number().nullable().optional(),
  openVersionStatus: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

/**
 * One condition leaf. `condition` is the catalogue code; `dimension` is the older alias
 * the server still sends with the same value. `code` is whichever arrived.
 */
export const PromotionConditionSchema = z
  .object({
    condition: z.string().optional(),
    dimension: z.string().optional(),
    conditionName: z.string().nullable().optional(),
    valueType: z.string().nullable().optional(),
    operator: z.string(),
    values: z.array(z.string()).default([]),
    group: z.number().nullable().optional(),
  })
  .transform((c) => ({ ...c, code: c.condition ?? c.dimension ?? '' }));

export type PromotionConditionLeafDto = z.infer<typeof PromotionConditionSchema>;

/** The nested AND / OR tree. Always present on newer servers, even for a flat rule. */
export interface PromotionRuleDto {
  operator: string;
  conditions: PromotionConditionLeafDto[];
  groups: PromotionRuleDto[];
}

export const PromotionRuleSchema: z.ZodType<PromotionRuleDto, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    operator: z.string().default('And'),
    conditions: z.array(PromotionConditionSchema).default([]),
    groups: z.array(PromotionRuleSchema).default([]),
  })
);

export const RELATIONSHIP_TYPES = ['Requires', 'DependsOn', 'Excludes', 'CombinesWith'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/** What each link means, per quotation line. From the engine's own definitions. */
export const RELATIONSHIP_INFO: Record<RelationshipType, { label: string; hint: string }> = {
  Requires: { label: 'Requires', hint: "Applies only if the linked promotion's conditions also hold." },
  DependsOn: { label: 'Depends on', hint: 'Applies only if the linked promotion actually ends up applied.' },
  Excludes: { label: 'Excludes', hint: 'Never together — the higher priority one wins.' },
  CombinesWith: { label: 'Combines with', hint: 'Applies together even when stacking would stop it.' },
};

export const PromotionRelationshipSchema = z.object({
  relatedPromotionId: z.string(),
  relatedPromotionCode: z.string().nullable().optional(),
  // A string, not an enum: a newer kind from the server is shown rather than refused.
  type: z.string(),
});

export type PromotionRelationshipDto = z.infer<typeof PromotionRelationshipSchema>;

export const PromotionTierSchema = z.object({
  fromQuantity: z.number().nullable().optional(),
  toQuantity: z.number().nullable().optional(),
  rewardValue: z.number().nullable().optional(),
  freeQuantity: z.number().nullable().optional(),
});

export const PromotionApprovalSchema = z.object({
  stage: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  decidedBy: z.string().nullable().optional(),
  decidedAt: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
});

export const PromotionVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number(),
  status: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  stacking: z.string().nullable().optional(),
  rewardType: z.string().nullable().optional(),
  rewardValue: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  freeMaterialNumber: z.string().nullable().optional(),
  requiresSapSync: z.boolean().nullable().optional(),
  sapConditionType: z.string().nullable().optional(),
  sapStatus: z.string().nullable().optional(),
  sapConditionRecord: z.string().nullable().optional(),
  conditions: z.array(PromotionConditionSchema).default([]),
  tiers: z.array(PromotionTierSchema).default([]),
  approvals: z.array(PromotionApprovalSchema).default([]),
  rule: PromotionRuleSchema.optional(),
  isNestedRule: z.boolean().default(false),
  relationships: z.array(PromotionRelationshipSchema).default([]),
});

export const PromotionDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  businessType: z.string(),
  businessTypeName: z.string().nullable().optional(),
  liveVersionNumber: z.number().nullable().optional(),
  openVersionNumber: z.number().nullable().optional(),
  versions: z.array(PromotionVersionSchema).default([]),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export const CategoryMappingSchema = z.object({
  categoryCode: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  sapPriceGroup: z.string().nullable().optional(),
});

const PromotionPageSchema = z.object({
  items: z.array(PromotionListItemSchema).default([]),
  totalCount: z.number().default(0),
});

/**
 * One row an import refused.
 *
 * `sheet` matters as much as `row`: a promotion spans three worksheets, so a row number
 * on its own sends somebody to the wrong line two thirds of the time.
 */
export const PromotionImportErrorSchema = z.object({
  sheet: z.string().default('Promotions'),
  row: z.number(),
  code: z.string().nullable().optional(),
  field: z.string().default('Row'),
  value: z.string().nullable().optional(),
  message: z.string(),
});

/**
 * What an import did, or would have done.
 *
 * `imported` is the field that matters and the counts do not imply it: the import is
 * all-or-nothing, so `created` can read 90 on a workbook that wrote nothing. Anything on
 * screen that leads with a count has to say which of the two it means.
 */
export const PromotionImportResultSchema = z.object({
  totalRows: z.number().default(0),
  created: z.number().default(0),
  updated: z.number().default(0),
  failedRows: z.number().default(0),
  imported: z.boolean().default(false),
  codes: z.array(z.string()).default([]),
  errors: z.array(PromotionImportErrorSchema).default([]),
});

export type PromotionImportErrorDto = z.infer<typeof PromotionImportErrorSchema>;
export type PromotionImportResultDto = z.infer<typeof PromotionImportResultSchema>;

export type PromotionListItemDto = z.infer<typeof PromotionListItemSchema>;
export type PromotionDetailDto = z.infer<typeof PromotionDetailSchema>;
export type PromotionVersionDto = z.infer<typeof PromotionVersionSchema>;
export type PromotionConditionDto = z.infer<typeof PromotionConditionSchema>;
export type CategoryMappingDto = z.infer<typeof CategoryMappingSchema>;

export interface ConditionInput {
  condition: string;
  operator: string;
  values: string[];
  group?: number;
}

export interface RuleInput {
  operator: 'And' | 'Or';
  conditions: ConditionInput[];
  groups: RuleInput[];
}

/** What the create form sends. Mirrors `CreatePromotionRequest`. */
export interface CreatePromotionInput {
  code: string;
  businessType: string;
  name: string;
  description: string;
  validFrom: string;
  validTo: string;
  priority?: number;
  stacking?: string;
  rewardType: string;
  rewardValue?: number | null;
  currency?: string | null;
  unit?: string | null;
  requiresSapSync?: boolean;
  /**
   * The SAP mapping.
   *
   * `conditionType` is not optional in practice when `requiresSapSync` is true: the
   * server refuses to *submit* such a version without one, so a draft created without
   * it can be saved and then never moved along.
   */
  sap?: { conditionType?: string | null };
  /** The flat form. Ignored by the server when `rule` is sent. */
  conditions?: ConditionInput[];
  /** The nested AND / OR tree. Replaces `conditions` when present. */
  rule?: RuleInput;
  /** The whole list; an edit replaces whatever was there. */
  relationships?: { relatedPromotionId: string; type: RelationshipType }[];
  /** Quantity bands. A promotion with tiers must leave `rewardValue` null. */
  tiers?: {
    minQuantity: number;
    maxQuantity?: number | null;
    value?: number | null;
    freeQuantity?: number | null;
  }[];
}

// ── Mock service ──────────────────────────────────────────────────────────────

type Action = 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel';

/** Statuses a version cannot leave. */
const CLOSED = ['Rejected', 'Cancelled', 'Deactivated', 'Superseded', 'Expired'];

const PAST: Record<Action, string> = {
  submit: 'submitted',
  approve: 'approved',
  reject: 'rejected',
  activate: 'activated',
  deactivate: 'deactivated',
  cancel: 'cancelled',
};

const spacedStatus = (status: string) => status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

function openVersion(p: StoredPromotion): PromotionVersionDto {
  return p.versions.find((v) => v.versionNumber === p.openVersionNumber) ?? p.versions[p.versions.length - 1];
}

function typeName(code: string): string | null {
  return promotionTypeStore.get().find((t) => t.code === code)?.name ?? null;
}

function toDetail(p: StoredPromotion): PromotionDetailDto {
  const { updatedAt: _updatedAt, ...rest } = p;
  return clone({ ...rest, businessTypeName: typeName(p.businessType) });
}

/** The list row. Carries the reward value too, so the list can show "1%" not "Percentage". */
function toListItem(p: StoredPromotion): PromotionListItemDto {
  const open = openVersion(p);
  return {
    id: p.id,
    code: p.code,
    name: open.name,
    businessType: p.businessType,
    businessTypeName: typeName(p.businessType),
    rewardType: open.rewardType,
    rewardValue: open.rewardValue,
    currency: open.currency,
    versionNumber: open.versionNumber,
    status: open.status,
    validFrom: open.validFrom,
    validTo: open.validTo,
    priority: open.priority,
    stacking: open.stacking,
    sapConditionType: open.sapConditionType,
    sapStatus: open.sapStatus,
    liveVersionNumber: p.liveVersionNumber,
    openVersionNumber: p.openVersionNumber,
    openVersionStatus: open.status,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

interface ListFilter {
  status?: string;
  businessType?: string;
  sapStatus?: string;
  search?: string;
  dimension?: string;
  value?: string;
}

function hasCondition(rule: PromotionRuleDto | undefined, code: string, value?: string): boolean {
  if (!rule) return false;
  const wanted = code.toUpperCase();
  const hit = rule.conditions.some(
    (c) => c.code.toUpperCase() === wanted && (!value || c.values.some((v) => v.toUpperCase() === value.toUpperCase()))
  );
  return hit || rule.groups.some((g) => hasCondition(g, code, value));
}

function filtered(query: ListFilter): StoredPromotion[] {
  const term = query.search?.trim().toLowerCase();
  return promotionStore
    .get()
    .filter((p) => {
      const open = openVersion(p);
      if (query.status && open.status !== query.status) return false;
      if (query.businessType && p.businessType !== query.businessType) return false;
      if (query.sapStatus && open.sapStatus !== query.sapStatus) return false;
      if (term && !p.code.toLowerCase().includes(term) && !open.name.toLowerCase().includes(term)) return false;
      if (query.dimension && !hasCondition(open.rule, query.dimension, query.value)) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function find(id: string): StoredPromotion {
  const found = promotionStore.get().find((p) => p.id === id);
  if (!found) throw promotionError('Promotion.NotFound', 'This promotion no longer exists.', 404);
  return found;
}

/** Writes one promotion back and returns it as the detail DTO. */
function save(next: StoredPromotion): PromotionDetailDto {
  next.updatedAt = nowIso();
  promotionStore.update((all) => {
    const i = all.findIndex((p) => p.id === next.id);
    if (i === -1) return [next, ...all];
    all[i] = next;
    return all;
  });
  return toDetail(next);
}

/** Every leaf named, typed and checked against the condition catalogue. */
function resolveRule(input: RuleInput): PromotionRuleDto {
  const definitions = conditionStore.get();
  const walk = (g: RuleInput): PromotionRuleDto => {
    if (g !== input && g.conditions.length === 0 && g.groups.length === 0) {
      throw promotionError('Promotion.RuleInvalid', 'Every group needs at least one condition.');
    }
    return {
      operator: g.operator,
      conditions: g.conditions.map((c) => {
        const def = definitions.find((d) => d.code.toUpperCase() === c.condition.toUpperCase());
        if (!def) throw promotionError('Promotion.ConditionUnknown', 'One of the conditions is not in the catalogue.');
        if (!def.isActive) throw promotionError('Promotion.ConditionInactive', 'A condition was deactivated — replace it.');
        const values = c.values.map((v) => v.trim().toUpperCase());
        const allowed = def.valueSource === 'Static' ? def.values.filter((v) => v.isActive).map((v) => v.value.toUpperCase()) : [];
        if (allowed.length && values.some((v) => !allowed.includes(v))) {
          throw promotionError('Promotion.ConditionValueNotAllowed', 'A value is not in that condition’s list.');
        }
        return {
          condition: def.code,
          dimension: def.code,
          code: def.code,
          conditionName: def.name,
          valueType: def.valueType,
          operator: c.operator,
          values,
        };
      }),
      groups: g.groups.map(walk),
    };
  };
  return walk(input);
}

function newVersion(
  p: Pick<StoredPromotion, 'id'>,
  versionNumber: number,
  fields: Omit<PromotionVersionDto, 'id' | 'versionNumber' | 'status' | 'conditions' | 'approvals' | 'isNestedRule' | 'sapStatus' | 'sapConditionRecord'> & {
    rule: PromotionRuleDto;
  }
): PromotionVersionDto {
  return {
    ...fields,
    id: `${p.id}-V${versionNumber}`,
    versionNumber,
    status: 'Draft',
    conditions: flatten(fields.rule),
    approvals: [],
    isNestedRule: isNested(fields.rule) || fields.relationships.length > 0,
    sapStatus: fields.requiresSapSync ? 'NotSynced' : 'NotRequired',
    sapConditionRecord: null,
  };
}

export const promotionsApi = {
  /** The catalogue, filtered. */
  list: async (
    query: {
      status?: string;
      businessType?: string;
      sapStatus?: string;
      search?: string;
      dimension?: string;
      value?: string;
      page?: number;
      pageSize?: number;
    } = {},
    signal?: AbortSignal
  ) => {
    await mockDelay(undefined, signal);
    const rows = filtered(query);
    const page = Math.max(1, query.page ?? 1);
    const size = Math.max(1, query.pageSize ?? 50);
    return { items: rows.slice((page - 1) * size, page * size).map(toListItem), totalCount: rows.length };
  },

  /** One promotion with every version, condition, tier and signature. */
  get: async (id: string, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    return toDetail(find(id));
  },

  create: async (input: CreatePromotionInput, signal?: AbortSignal) => {
    await mockDelay(450, signal);
    const all = promotionStore.get();
    const code = input.code.trim().toUpperCase();
    if (all.some((p) => p.code.toUpperCase() === code)) {
      throw promotionError('Promotion.CodeTaken', `A promotion with code ${code} already exists.`, 409);
    }
    const type = promotionTypeStore.get().find((t) => t.code === input.businessType);
    if (!type) throw promotionError('Promotion.TypeNotFound', 'Choose a promotion type.');
    if (!type.isActive) throw promotionError('Promotion.TypeInactive', 'This type is deactivated. Choose another or reactivate it.');
    if (input.validTo < input.validFrom) {
      throw promotionError('Promotion.ValidityInvalid', 'The promotion ends before it starts.');
    }

    const rule = resolveRule(
      input.rule ?? { operator: 'And', conditions: input.conditions ?? [], groups: [] }
    );
    const relationships = (input.relationships ?? []).map((r) => {
      const target = all.find((p) => p.id === r.relatedPromotionId);
      if (!target) throw promotionError('Promotion.RelationshipTargetNotFound', 'A linked promotion no longer exists.');
      return { relatedPromotionId: target.id, relatedPromotionCode: target.code, type: r.type };
    });

    const id = mockId('PRM');
    const now = nowIso();
    const record: StoredPromotion = {
      id,
      code,
      businessType: type.code,
      liveVersionNumber: null,
      openVersionNumber: 1,
      createdBy: currentUserName(),
      createdAt: now,
      updatedAt: now,
      versions: [
        newVersion({ id }, 1, {
          name: input.name,
          description: input.description,
          validFrom: input.validFrom,
          validTo: input.validTo,
          priority: input.priority ?? 0,
          stacking: input.stacking ?? 'Stackable',
          rewardType: input.rewardType,
          rewardValue: input.rewardValue ?? null,
          currency: input.currency ?? null,
          unit: input.unit ?? null,
          freeMaterialNumber: null,
          requiresSapSync: input.requiresSapSync ?? false,
          sapConditionType: input.sap?.conditionType?.trim().toUpperCase() || null,
          rule,
          relationships,
          tiers: (input.tiers ?? []).map((t) => ({
            fromQuantity: t.minQuantity,
            toQuantity: t.maxQuantity ?? null,
            rewardValue: t.value ?? null,
            freeQuantity: t.freeQuantity ?? null,
          })),
        }),
      ],
    };
    return save(record);
  },

  /**
   * Moves a promotion along its lifecycle.
   *
   * One function rather than seven, because the calls differ only in the segment and
   * whether they carry a reason. `reject`, `deactivate` and `cancel` require one.
   */
  transition: async (
    id: string,
    action: Action,
    payload?: { comment?: string; reason?: string },
    signal?: AbortSignal
  ) => {
    await mockDelay(450, signal);
    const p = clone(find(id));
    const open = openVersion(p);
    const who = currentUserName();
    const at = nowIso();
    const reason = payload?.reason?.trim() || payload?.comment?.trim() || null;
    const refuse = () =>
      promotionError('Promotion.InvalidTransition', `Version ${open.versionNumber} is ${spacedStatus(open.status)} — it cannot be ${PAST[action]}.`, 409);

    if (['reject', 'deactivate', 'cancel'].includes(action) && (!reason || reason.length < 3)) {
      throw promotionError('Promotion.ReasonRequired', 'Give a reason — it is stored on the record.');
    }

    switch (action) {
      case 'submit':
        if (open.status !== 'Draft') throw refuse();
        if (open.requiresSapSync && !open.sapConditionType) {
          throw promotionError('Promotion.SapConditionTypeRequired', 'Add a SAP condition type before submitting — this promotion needs a SAP record.');
        }
        open.status = 'UnderCommercialReview';
        break;
      case 'approve':
        if (open.status === 'UnderCommercialReview') {
          open.approvals.push({ stage: 'Commercial', outcome: 'Approved', decidedBy: who, decidedAt: at, comment: payload?.comment ?? null });
          open.status = 'UnderFinanceReview';
        } else if (open.status === 'UnderFinanceReview') {
          open.approvals.push({ stage: 'Finance', outcome: 'Approved', decidedBy: who, decidedAt: at, comment: payload?.comment ?? null });
          open.status = 'Approved';
        } else throw refuse();
        break;
      case 'reject':
        if (open.status !== 'UnderCommercialReview' && open.status !== 'UnderFinanceReview') throw refuse();
        open.approvals.push({
          stage: open.status === 'UnderCommercialReview' ? 'Commercial' : 'Finance',
          outcome: 'Rejected',
          decidedBy: who,
          decidedAt: at,
          comment: reason,
        });
        open.status = 'Rejected';
        break;
      case 'activate': {
        if (open.status !== 'Approved') throw refuse();
        if (open.requiresSapSync && open.sapStatus !== 'Synced') {
          throw promotionError('Promotion.SapNotSynced', 'The SAP condition record is not in place yet. Queue it for SAP first, then activate.');
        }
        // The version it replaces stops pricing the moment this one starts.
        p.versions.forEach((v) => {
          if (v.status === 'Active') v.status = 'Superseded';
        });
        open.status = 'Active';
        p.liveVersionNumber = open.versionNumber;
        break;
      }
      case 'deactivate':
        if (open.status !== 'Active') throw refuse();
        open.status = 'Deactivated';
        open.approvals.push({ stage: 'Deactivation', outcome: 'Deactivated', decidedBy: who, decidedAt: at, comment: reason });
        p.liveVersionNumber = null;
        break;
      case 'cancel':
        if (open.status !== 'Draft' && open.status !== 'Approved') throw refuse();
        open.status = 'Cancelled';
        open.approvals.push({ stage: 'Cancellation', outcome: 'Cancelled', decidedBy: who, decidedAt: at, comment: reason });
        break;
      default:
        throw refuse();
    }

    return save(p);
  },

  /**
   * Queues the promotion's condition for the SAP SD team. The prototype plays the SD
   * team too: after a moment the condition record number comes back and it reads Synced.
   */
  syncToSap: async (id: string, signal?: AbortSignal) => {
    await mockDelay(1200, signal);
    const p = clone(find(id));
    const open = openVersion(p);
    if (!open.requiresSapSync) throw promotionError('Promotion.SapNotRequired', 'This promotion does not need a SAP record.');
    if (!open.sapConditionType) {
      throw promotionError('Promotion.SapConditionTypeRequired', 'Add a SAP condition type before queueing it for SAP.');
    }
    if (CLOSED.includes(open.status)) throw promotionError('Promotion.InvalidTransition', 'A closed version cannot be sent to SAP.', 409);
    open.sapStatus = 'Synced';
    open.sapConditionRecord = `00${String(41_300_000 + Math.floor(Math.random() * 90_000))}`;
    return save(p);
  },

  /** Downloads the blank workbook (CSV in the prototype — every spreadsheet opens it). */
  downloadTemplate: async (signal?: AbortSignal) => {
    await mockDelay(200, signal);
    saveBlob(templateBlob(), 'promotions-template.csv');
  },

  /**
   * Exports the catalogue under the same filters as {@link list}, in the template's
   * shape — so an export can be edited and uploaded straight back.
   */
  exportCatalogue: async (
    query: { status?: string; businessType?: string; sapStatus?: string; search?: string; dimension?: string; value?: string } = {},
    signal?: AbortSignal
  ) => {
    await mockDelay(350, signal);
    const rows = filtered(query).map((p) => workbookRow(toListItem(p), openVersion(p)));
    saveBlob(csvBlob(WORKBOOK_COLUMNS, rows), `promotions-${fileStamp()}.csv`);
  },

  /**
   * Reads a workbook and returns what it would do — and, unless `dryRun`, does it.
   * All-or-nothing: one bad row anywhere and nothing is written.
   */
  import: async (file: File, dryRun = false, signal?: AbortSignal): Promise<PromotionImportResultDto> => {
    await mockDelay(700, signal);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return {
        totalRows: 0,
        created: 0,
        updated: 0,
        failedRows: 1,
        imported: false,
        codes: [],
        errors: [
          {
            sheet: 'Workbook',
            row: 1,
            code: null,
            field: 'File',
            value: file.name,
            message: 'This prototype reads the CSV workbook. In Excel use File › Save As › CSV UTF-8, then upload that file.',
          },
        ],
      };
    }

    const outcome = validateWorkbook(await file.text(), {
      types: promotionTypeStore.get(),
      conditions: conditionStore.get(),
      promotions: promotionStore.get(),
    });
    const failedRows = new Set(outcome.errors.map((e) => `${e.row}`)).size;
    const imported = !dryRun && failedRows === 0 && outcome.rows.length > 0;

    if (imported) {
      const all = clone(promotionStore.get());
      const author = currentUserName();
      const now = nowIso();
      outcome.rows.forEach((row) => {
        const existing = all.find((p) => p.code.toUpperCase() === row.code);
        const fields = {
          name: row.name,
          description: row.description,
          validFrom: row.validFrom,
          validTo: row.validTo,
          priority: row.priority,
          stacking: row.stacking,
          rewardType: row.rewardType,
          rewardValue: row.rewardValue,
          currency: row.currency,
          unit: row.unit,
          freeMaterialNumber: null,
          requiresSapSync: row.requiresSapSync,
          sapConditionType: row.sapConditionType,
          rule: row.rule,
          relationships: [],
          tiers: row.tiers,
        };
        if (existing) {
          const latest = existing.versions[existing.versions.length - 1];
          existing.businessType = row.businessType;
          existing.updatedAt = now;
          if (latest.status === 'Draft') {
            // An open draft is overwritten rather than stacked under another one.
            Object.assign(latest, newVersion(existing, latest.versionNumber, fields));
          } else {
            existing.versions.push(newVersion(existing, latest.versionNumber + 1, fields));
            existing.openVersionNumber = latest.versionNumber + 1;
          }
        } else {
          const id = mockId('PRM');
          all.unshift({
            id,
            code: row.code,
            businessType: row.businessType,
            liveVersionNumber: null,
            openVersionNumber: 1,
            createdBy: author,
            createdAt: now,
            updatedAt: now,
            versions: [newVersion({ id }, 1, fields)],
          });
        }
      });
      promotionStore.set(all);
    }

    return {
      totalRows: outcome.totalRows,
      created: outcome.created.length,
      updated: outcome.updated.length,
      failedRows,
      imported,
      codes: [...outcome.created, ...outcome.updated],
      errors: outcome.errors,
    };
  },

  /** Downloads the failed rows. Re-validates the file; never imports anything. */
  downloadErrorReport: async (file: File, signal?: AbortSignal) => {
    const result = await promotionsApi.import(file, true, signal);
    saveBlob(errorReportBlob(result.errors), `promotion-import-errors-${fileStamp()}.csv`);
  },

  /** The category → SAP price group join every promotion is keyed on. */
  listCategoryMappings: async (signal?: AbortSignal): Promise<CategoryMappingDto[]> =>
    mockResolve(categoryMappings(), signal),
};
