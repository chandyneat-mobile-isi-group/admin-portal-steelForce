export type AuthFailureReason =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_disabled'
  | 'email_not_confirmed'
  | 'password_expired'
  | 'session_expired'
  | 'network_error'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public readonly reason: AuthFailureReason,
    message: string,
    /** HTTP status of the failed response, when there was one. */
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Finite auth states. The portal renders only in `authenticated`; every other
 * state shows the splash or the login screen, which is what guarantees the
 * dashboard is never painted before the session is resolved.
 */
