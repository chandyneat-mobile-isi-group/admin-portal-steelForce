/**
 * The promotion catalogue — types and condition definitions. In the prototype these are
 * served from the local mock store (`./data`), with the same contract the server had.
 *
 * Both used to be hard-coded lists in the portal (seven business types, a dozen
 * dimensions). They are now tables an administrator maintains, so nothing here names a
 * type or a condition: the screens read them, and a new one appears without a deploy.
 *
 * What stays constant is engine behaviour — stacking modes, reward types, the AND/OR
 * operators and the four relationship kinds — because those are code, not data.
 */
import { z } from 'zod';
import { clone, mockDelay, mockId, mockResolve } from '@/services/mock';
import { isApiError } from '@/domain/errors/api-error';
import { PROMOTION_FACTS, VALUE_SOURCE_KEYS, sourceValues } from './data/catalog';
import { conditionStore, promotionError, promotionStore, promotionTypeStore } from './data/store';

// ── Schemas ───────────────────────────────────────────────────────────────────

export const PromotionTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  feedKind: z.string().default('general'),
  sortOrder: z.number().default(0),
  status: z.string().default('Active'),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  promotionCount: z.number().default(0),
});

export const ConditionValueSchema = z.object({
  value: z.string(),
  label: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const VALUE_TYPES = ['Text', 'Number'] as const;
export const VALUE_SOURCES = ['Static', 'Database', 'Sap', 'Api'] as const;
export const SCOPES = ['customer', 'order', 'line'] as const;

export const ConditionDefinitionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  // Tolerant: an unknown value type or source from a newer server is shown, not refused.
  valueType: z.string().default('Text'),
  operators: z.array(z.string()).default([]),
  valueSource: z.string().default('Static'),
  sourceKey: z.string().nullable().optional(),
  factKey: z.string().default(''),
  scope: z.string().default('order'),
  sortOrder: z.number().default(0),
  status: z.string().default('Active'),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  values: z.array(ConditionValueSchema).default([]),
});

export const ConditionValuesSchema = z.object({
  code: z.string().optional(),
  valueSource: z.string().optional(),
  sourceKey: z.string().nullable().optional(),
  resolved: z.boolean().default(true),
  values: z.array(ConditionValueSchema).default([]),
});

export const PromotionFactSchema = z.object({
  key: z.string(),
  description: z.string().nullable().optional(),
  valueType: z.string().default('Text'),
  scope: z.string().default('order'),
});

export const ValueSourceKeySchema = z.object({
  valueSource: z.string(),
  sourceKey: z.string(),
  description: z.string().nullable().optional(),
});

export type PromotionTypeDto = z.infer<typeof PromotionTypeSchema>;
export type ConditionValueDto = z.infer<typeof ConditionValueSchema>;
export type ConditionDefinitionDto = z.infer<typeof ConditionDefinitionSchema>;
export type ConditionValuesDto = z.infer<typeof ConditionValuesSchema>;
export type PromotionFactDto = z.infer<typeof PromotionFactSchema>;
export type ValueSourceKeyDto = z.infer<typeof ValueSourceKeySchema>;

export interface PromotionTypeInput {
  code?: string;
  name: string;
  description?: string | null;
  feedKind?: string;
  sortOrder?: number;
}

export interface ConditionDefinitionInput {
  code?: string;
  name: string;
  description?: string | null;
  valueType: string;
  valueSource: string;
  sourceKey?: string | null;
  factKey: string;
  sortOrder?: number;
  values?: { value: string; label: string; isActive: boolean }[];
}

/** The mobile feed groups a type's cards by this. Free text is allowed too. */
export const FEED_KINDS = [
  'general',
  'paymentMethod',
  'transportationPickup',
  'productSku',
  'customerProduct',
  'quantityTier',
  'buyXGetY',
] as const;

/** Friendly words for the operators a definition offers. Unknown ones show as sent. */
export const OPERATOR_LABELS: Record<string, string> = {
  In: 'is one of',
  NotIn: 'is not one of',
  GreaterOrEqual: '≥',
  LessOrEqual: '≤',
  Between: 'between',
};

export const operatorLabel = (op: string) => OPERATOR_LABELS[op] ?? op.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** Catalogue order: sort order, then name. */
export function byCatalogOrder<T extends { sortOrder: number; name: string }>(a: T, b: T) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/** Codes are case-insensitive on the server. */
export function findByCode<T extends { code: string }>(list: readonly T[] | undefined, code?: string | null) {
  if (!list || !code) return undefined;
  const wanted = code.toUpperCase();
  return list.find((item) => item.code.toUpperCase() === wanted);
}

// ── API ───────────────────────────────────────────────────────────────────────

const CATALOG_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function checkIdentity(input: { code?: string; name: string; description?: string | null }, isNew: boolean) {
  if (isNew && !CATALOG_CODE.test(input.code ?? '')) {
    throw promotionError('Promotion.CatalogCodeInvalid', 'Code: start with a letter, then letters, digits or _ (max 64).');
  }
  if (!input.name.trim() || input.name.trim().length > 128) {
    throw promotionError('Promotion.CatalogNameInvalid', 'Name is required (max 128 characters).');
  }
  if ((input.description ?? '').length > 1024) {
    throw promotionError('Promotion.CatalogDescriptionTooLong', 'Description is too long (max 1024 characters).');
  }
}

/** Types carry a live count of the promotions filed under them. */
function withCounts(types: PromotionTypeDto[]): PromotionTypeDto[] {
  const counts = new Map<string, number>();
  promotionStore.get().forEach((p) => counts.set(p.businessType, (counts.get(p.businessType) ?? 0) + 1));
  return types.map((t) => ({ ...t, promotionCount: counts.get(t.code) ?? 0 }));
}

function findType(id: string): PromotionTypeDto {
  const found = promotionTypeStore.get().find((t) => t.id === id);
  if (!found) throw promotionError('Promotion.TypeNotFound', 'This type no longer exists.', 404);
  return found;
}

function findCondition(id: string): ConditionDefinitionDto {
  const found = conditionStore.get().find((d) => d.id === id);
  if (!found) throw promotionError('Promotion.ConditionDefinitionNotFound', 'That condition no longer exists.', 404);
  return found;
}

function putType(next: PromotionTypeDto): PromotionTypeDto {
  promotionTypeStore.update((all) => {
    const i = all.findIndex((t) => t.id === next.id);
    if (i === -1) all.push(next);
    else all[i] = next;
    return all;
  });
  return withCounts([next])[0];
}

function putCondition(next: ConditionDefinitionDto): ConditionDefinitionDto {
  conditionStore.update((all) => {
    const i = all.findIndex((d) => d.id === next.id);
    if (i === -1) all.push(next);
    else all[i] = next;
    return all;
  });
  return clone(next);
}

function usesCondition(code: string): boolean {
  const walk = (rule?: { conditions: { code: string }[]; groups: unknown[] }): boolean =>
    Boolean(rule) &&
    (rule!.conditions.some((c) => c.code === code) ||
      (rule!.groups as { conditions: { code: string }[]; groups: unknown[] }[]).some(walk));
  return promotionStore.get().some((p) => p.versions.some((v) => walk(v.rule)));
}

/** Validates and normalises a definition the way the server did. */
function checkCondition(input: ConditionDefinitionInput, existing?: ConditionDefinitionDto) {
  checkIdentity(input, !existing);
  if (!(VALUE_TYPES as readonly string[]).includes(input.valueType) || !(VALUE_SOURCES as readonly string[]).includes(input.valueSource)) {
    throw promotionError('Promotion.ConditionDefinitionInvalid', 'The value type or source is not recognised.');
  }
  if (input.valueSource !== 'Static' && !input.sourceKey?.trim()) {
    throw promotionError('Promotion.ConditionSourceKeyRequired', 'Choose a source key for this value source.');
  }
  const fact = PROMOTION_FACTS.find((f) => f.key === input.factKey);
  if (!fact && !/^request\.[A-Za-z][A-Za-z0-9_]*$/.test(input.factKey)) {
    throw promotionError('Promotion.ConditionFactInvalid', 'The fact this condition reads is not valid.');
  }
  const values = input.values ?? [];
  const seen = new Set(values.map((v) => v.value.toUpperCase()));
  if (seen.size !== values.length) throw promotionError('Promotion.ConditionValueDuplicate', 'Two values are the same.');
  if (input.valueType === 'Number' && values.some((v) => !Number.isFinite(Number(v.value)))) {
    throw promotionError('Promotion.ConditionValueInvalid', 'One of the values is not valid.');
  }
  if (existing && existing.valueType !== input.valueType && usesCondition(existing.code)) {
    throw promotionError('Promotion.ConditionValueTypeInUse', 'Promotions use this condition, so its value type is locked.');
  }
  return {
    scope: fact?.scope ?? 'order',
    operators: input.valueType === 'Number' ? ['GreaterOrEqual', 'LessOrEqual', 'Between'] : ['In', 'NotIn'],
  };
}

export const promotionCatalogApi = {
  listTypes: async (includeInactive = true, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    return withCounts(clone(promotionTypeStore.get()).filter((t) => includeInactive || t.isActive));
  },
  createType: async (input: PromotionTypeInput) => {
    await mockDelay(350);
    checkIdentity(input, true);
    const code = input.code!.trim();
    if (promotionTypeStore.get().some((t) => t.code.toUpperCase() === code.toUpperCase())) {
      throw promotionError('Promotion.TypeCodeTaken', 'That code is already used by another type.', 409);
    }
    return putType({
      id: mockId('PT'),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      feedKind: input.feedKind?.trim() || 'general',
      sortOrder: input.sortOrder ?? 0,
      status: 'Active',
      isActive: true,
      isSystem: false,
      promotionCount: 0,
    });
  },
  updateType: async (id: string, input: PromotionTypeInput) => {
    await mockDelay(350);
    const current = findType(id);
    checkIdentity(input, false);
    return putType({
      ...current,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      feedKind: input.feedKind?.trim() || current.feedKind,
      sortOrder: input.sortOrder ?? current.sortOrder,
    });
  },
  setTypeStatus: async (id: string, isActive: boolean) => {
    await mockDelay(300);
    return putType({ ...findType(id), isActive, status: isActive ? 'Active' : 'Inactive' });
  },

  listConditions: async (includeInactive = true, signal?: AbortSignal) => {
    await mockDelay(undefined, signal);
    return clone(conditionStore.get()).filter((d) => includeInactive || d.isActive);
  },
  createCondition: async (input: ConditionDefinitionInput) => {
    await mockDelay(350);
    const derived = checkCondition(input);
    const code = input.code!.trim();
    if (conditionStore.get().some((d) => d.code.toUpperCase() === code.toUpperCase())) {
      throw promotionError('Promotion.ConditionDefinitionCodeTaken', 'That code is already used by another condition.', 409);
    }
    return putCondition({
      id: mockId('PC'),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      valueType: input.valueType,
      valueSource: input.valueSource,
      sourceKey: input.valueSource === 'Static' ? null : input.sourceKey?.trim() ?? null,
      factKey: input.factKey,
      sortOrder: input.sortOrder ?? 0,
      status: 'Active',
      isActive: true,
      isSystem: false,
      values: input.valueSource === 'Static' ? input.values ?? [] : [],
      ...derived,
    });
  },
  updateCondition: async (id: string, input: ConditionDefinitionInput) => {
    await mockDelay(350);
    const current = findCondition(id);
    const derived = checkCondition(input, current);
    return putCondition({
      ...current,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      valueType: input.valueType,
      valueSource: input.valueSource,
      sourceKey: input.valueSource === 'Static' ? null : input.sourceKey?.trim() ?? null,
      factKey: input.factKey,
      sortOrder: input.sortOrder ?? current.sortOrder,
      values: input.valueSource === 'Static' ? input.values ?? current.values : [],
      ...derived,
    });
  },
  setConditionStatus: async (id: string, isActive: boolean) => {
    await mockDelay(300);
    return putCondition({ ...findCondition(id), isActive, status: isActive ? 'Active' : 'Inactive' });
  },
  replaceConditionValues: async (id: string, values: ConditionValueDto[]) => {
    await mockDelay(300);
    const current = findCondition(id);
    if (new Set(values.map((v) => v.value.toUpperCase())).size !== values.length) {
      throw promotionError('Promotion.ConditionValueDuplicate', 'Two values are the same.');
    }
    return putCondition({ ...current, values });
  },
  /** The picker values: the static list, or the depot / material master behind a source key. */
  conditionValues: async (id: string, search?: string, signal?: AbortSignal): Promise<ConditionValuesDto> => {
    await mockDelay(220, signal);
    const def = findCondition(id);
    const listed = def.valueSource === 'Static' ? def.values : def.valueSource === 'Api' ? undefined : sourceValues(def.sourceKey);
    const term = search?.trim().toLowerCase();
    const values = (listed ?? []).filter(
      (v) => !term || v.value.toLowerCase().includes(term) || (v.label ?? '').toLowerCase().includes(term)
    );
    return {
      code: def.code,
      valueSource: def.valueSource,
      sourceKey: def.sourceKey,
      resolved: listed !== undefined,
      values: clone(values),
    };
  },
  facts: async (signal?: AbortSignal) => mockResolve(PROMOTION_FACTS, signal),
  sources: async (signal?: AbortSignal) => mockResolve(VALUE_SOURCE_KEYS, signal),
};

// ── Errors ────────────────────────────────────────────────────────────────────

/** §5 of the upgrade guide: what to tell a person for each promotion error code. */
const PROMOTION_ERROR_TEXT: Record<string, string> = {
  'Promotion.TypeNotFound': 'Choose a promotion type.',
  'Promotion.TypeInactive': 'This type is deactivated. Choose another or reactivate it.',
  'Promotion.TypeCodeTaken': 'That code is already used by another type.',
  'Promotion.ConditionDefinitionNotFound': 'That condition no longer exists.',
  'Promotion.ConditionDefinitionCodeTaken': 'That code is already used by another condition.',
  'Promotion.ConditionDefinitionInvalid': 'The value type or source is not recognised.',
  'Promotion.ConditionSourceKeyRequired': 'Choose a source key for this value source.',
  'Promotion.ConditionFactInvalid': 'The fact this condition reads is not valid.',
  'Promotion.ConditionValueInvalid': 'One of the values is not valid.',
  'Promotion.ConditionValueDuplicate': 'Two values are the same.',
  'Promotion.ConditionValueTypeInUse': 'Promotions use this condition, so its value type is locked.',
  'Promotion.ConditionUnknown': 'One of the conditions is not in the catalogue.',
  'Promotion.ConditionInactive': 'A condition was deactivated — replace it.',
  'Promotion.ConditionValueNotAllowed': 'A value is not in that condition’s list.',
  'Promotion.CatalogCodeInvalid': 'Code: start with a letter, then letters, digits or _ (max 64).',
  'Promotion.CatalogNameInvalid': 'Name is required (max 128 characters).',
  'Promotion.CatalogDescriptionTooLong': 'Description is too long (max 1024 characters).',
  'Promotion.RuleInvalid': 'Every group needs at least one condition.',
  'Promotion.RelationshipInvalid': 'A link is duplicated, or requires and excludes the same promotion.',
  'Promotion.RelationshipSelf': 'A promotion cannot be linked to itself.',
  'Promotion.RelationshipTargetNotFound': 'A linked promotion no longer exists.',
  'Promotion.RelationshipCircular': 'These links make promotions depend on each other in a circle.',
  'Promotion.SelfApproval': 'You cannot sign a promotion you submitted, or sign both stages.',
};

export function promotionErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

/** A readable sentence for any error a promotion call can throw. */
export function promotionErrorMessage(error: unknown, fallback = 'The request failed.'): string {
  if (isApiError(error)) {
    if (error.code && PROMOTION_ERROR_TEXT[error.code]) return PROMOTION_ERROR_TEXT[error.code];
    const details = error.details as { detail?: unknown; title?: unknown } | undefined;
    if (details && typeof details.detail === 'string' && details.detail) return details.detail;
    if (details && typeof details.title === 'string' && details.title) return details.title;
    if (error.kind === 'forbidden') return 'You do not have permission to do this.';
    if (error.kind === 'network' || error.kind === 'timeout') return 'The server could not be reached.';
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
