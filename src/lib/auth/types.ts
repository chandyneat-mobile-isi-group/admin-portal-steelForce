/**
 * The auth barrel. Identity, the permission vocabulary, and the failure taxonomy
 * live in `domain/` because they are framework-free and shared; the session state
 * machine below is application-layer and stays here.
 */
export {
  ROLES,
  PERMISSIONS,
  type Permission,
  type Role,
} from '@/domain/enums/auth';
export type { User, Session, Credentials } from '@/domain/entities/auth';
import type { Session, User } from '@/domain/entities/auth';
import type { AuthFailureReason } from '@/domain/errors/auth-error';
export { AuthError, type AuthFailureReason } from '@/domain/errors/auth-error';

export type AuthStatus = 'initializing' | 'authenticating' | 'authenticated' | 'unauthenticated';

export type AuthState =
  | { status: 'initializing'; session: null; error: null }
  | { status: 'authenticating'; session: null; error: null }
  | { status: 'authenticated'; session: Session; error: null }
  | { status: 'unauthenticated'; session: null; error: AuthFailureReason | null };

/** Events the reducer accepts — the Bloc event set, in TypeScript. */
export type AuthEvent =
  | { type: 'restore.started' }
  | { type: 'restore.succeeded'; session: Session }
  | { type: 'restore.failed' }
  | { type: 'login.started' }
  | { type: 'login.succeeded'; session: Session }
  | { type: 'login.failed'; reason: AuthFailureReason }
  /** A silent refresh replaced the access token without a state transition. */
  | { type: 'session.refreshed'; session: Session }
  | { type: 'logout' }
  | { type: 'error.cleared' }
  | { type: 'user.updated'; user: Partial<User> };
