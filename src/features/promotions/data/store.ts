import { createPersistentStore } from '@/services/mock';
import { ApiError, type ApiErrorKind } from '@/domain/errors/api-error';
import { sessionStore } from '@/infrastructure/storage/session-store';
import { seedConditionDefinitions, seedPromotionTypes } from './catalog';
import { seedPromotions } from './promotions';

/**
 * The prototype's promotion "database": three localStorage-backed collections, so a
 * promotion created, signed or activated in one tab is still there after a refresh.
 */
export const promotionStore = createPersistentStore('promotions.records', seedPromotions);
export const promotionTypeStore = createPersistentStore('promotions.types', seedPromotionTypes);
export const conditionStore = createPersistentStore('promotions.conditions', seedConditionDefinitions);

/** Who is signing or authoring: the signed-in demo user. */
export function currentUserName(): string {
  return sessionStore.read()?.user.name ?? 'Demo user';
}

/**
 * The error a real endpoint would have answered with. `messageKey` carries the readable
 * sentence because the pages render `error.message` directly.
 */
export function promotionError(code: string, message: string, status = 422): ApiError {
  const kind: ApiErrorKind = status === 404 ? 'not_found' : status === 409 ? 'conflict' : 'validation';
  return new ApiError(status, kind, message, { code, details: { detail: message } });
}

export const nowIso = () => new Date().toISOString();
