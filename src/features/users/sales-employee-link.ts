/**
 * The Sales Representative ↔ SAP sales employee link.
 *
 * A rep's employee code *is* their SAP personnel number: it is what the mobile app's
 * depots are registered under (partner function VE). The server enforces this on
 * create; the portal also enforces it on edit, where the server does not yet.
 */
import { isApiError } from '@/domain/errors/api-error';

export const REPRESENTATIVE_ROLE = 'Sales Representative';

export const isRepresentativeRole = (role?: string | null) =>
  (role ?? '').trim().toLowerCase() === REPRESENTATIVE_ROLE.toLowerCase();

export const hasRepresentativeRole = (roles: readonly (string | null | undefined)[]) => roles.some(isRepresentativeRole);

/**
 * A code that cannot be a SAP personnel number: empty, or the old random `EMP…`
 * placeholder. Approximate — only the server knows the active SAP list.
 */
export const looksUnlinked = (code?: string | null) => !code || /^EMP/i.test(code.trim());

const LINK_ERRORS: Record<string, string> = {
  'User.SalesEmployeeCodeRequired': 'Pick the SAP sales employee for this representative.',
  'User.SalesEmployeeCodeUnknown': "That code isn't an active SAP sales employee. Pick one from the list.",
  'User.EmployeeCodeAlreadyExists': 'This SAP sales employee is already linked to another account.',
};

/**
 * The message for a failed create or edit: the link errors in plain words, otherwise
 * the server's own problem detail, otherwise the translated generic message.
 */
export function userSaveErrorMessage(
  error: unknown,
  translate: (key: string) => string,
  representative = true
): string {
  if (!isApiError(error)) return translate('feedback.error.body');
  // A duplicate code on any other role is the ordinary "employee code taken" case.
  const linkError = error.code && LINK_ERRORS[error.code] && (representative || error.code !== 'User.EmployeeCodeAlreadyExists');
  if (linkError) return LINK_ERRORS[error.code!];
  const details = error.details as { detail?: unknown; title?: unknown } | undefined;
  if (error.kind === 'validation' || error.kind === 'conflict' || error.kind === 'unknown') {
    if (details && typeof details.detail === 'string' && details.detail) return details.detail;
  }
  return translate(error.messageKey);
}
