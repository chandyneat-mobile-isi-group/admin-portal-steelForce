export type ApiErrorKind =
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export interface NormalizedApiError {
  status: number;
  kind: ApiErrorKind;
  /** A safe client-side identifier; never render raw backend messages by default. */
  code?: string;
  /** A translation-ready key for UI error surfaces. */
  messageKey: string;
  /** Raw structured detail retained for feature-specific field mapping, never for direct rendering. */
  details?: unknown;
  correlationId?: string;
}

export class ApiError extends Error implements NormalizedApiError {
  readonly name = 'ApiError';

  constructor(
    public readonly status: number,
    public readonly kind: ApiErrorKind,
    public readonly messageKey: string,
    options: Omit<NormalizedApiError, 'status' | 'kind' | 'messageKey'> = {}
  ) {
    super(messageKey);
    this.code = options.code;
    this.details = options.details;
    this.correlationId = options.correlationId;
  }

  readonly code?: string;
  readonly details?: unknown;
  readonly correlationId?: string;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

function messageKeyFor(kind: ApiErrorKind): string {
  return `api.error.${kind}`;
}

function errorCodeFrom(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  const code = obj.errorCode ?? obj.code;
  return typeof code === 'string' ? code : undefined;
}

function messageKeyForCode(code: string | undefined, defaultKey: string): string {
  if (!code) return defaultKey;
  const knownCodes: Record<string, string> = {
    'User.NotFound': 'api.error.user.notFound',
    'User.EmailAlreadyExists': 'api.error.user.emailAlreadyExists',
    'User.EmployeeCodeAlreadyExists': 'api.error.user.employeeCodeAlreadyExists',
    'User.PhoneNumberAlreadyExists': 'api.error.user.phoneNumberAlreadyExists',
    'User.CannotDeactivateSelf': 'api.error.user.cannotDeactivateSelf',
    'User.CannotDeleteSelf': 'api.error.user.cannotDeleteSelf',
    'User.CannotModifySystemAdmin': 'api.error.user.cannotModifySystemAdmin',
    'Role.NotFound': 'api.error.role.notFound',
    'Role.DuplicateName': 'api.error.role.duplicateName',
    'Role.SystemImmutable': 'api.error.role.systemImmutable',
    'Role.HasAssignedUsers': 'api.error.role.hasAssignedUsers',
    'Role.UnknownPermissions': 'api.error.role.unknownPermissions',
    'General.Validation': 'api.error.validation',
  };
  return knownCodes[code] || defaultKey;
}

export function httpApiError(status: number, body: unknown, correlationId?: string): ApiError {
  const kind = kindForStatus(status);
  const code = errorCodeFrom(body);
  const messageKey = messageKeyForCode(code, messageKeyFor(kind));
  return new ApiError(status, kind, messageKey, {
    code,
    details: body,
    correlationId,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
