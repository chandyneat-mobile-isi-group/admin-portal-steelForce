import { PERMISSIONS } from '@/domain/enums/auth';
import { AuthError, type Credentials, type Session, type User } from '@/lib/auth/types';
import { mockDelay } from '@/services/mock';
import { userRecords } from '@/features/users/data/mock-store';

/**
 * The contract the rest of the app codes against. The static prototype has one
 * implementation — `MockAuthRepository` — which checks a single fixed test account
 * entirely in the browser. Nothing outside this file knows how credentials are
 * checked.
 *
 * Prototype authentication only: no password hashing, no tokens, no server. It
 * exists so the login screen, route guards and logout can be demonstrated.
 */
export interface AuthRepository {
  /** Verifies credentials and issues a session. Throws `AuthError` on failure. */
  signIn(credentials: Credentials): Promise<Session>;
  /** Ends the session. */
  signOut(session: Session | null): Promise<void>;
  /**
   * Called once on app boot with whatever was in storage. Returns a session that's
   * good to use, or `null` if the person needs to sign in again.
   */
  verify(session: Session): Promise<Session | null>;
  /** The prototype never issues refresh tokens; kept so the context's contract holds. */
  refresh(refreshToken: string, persistent: boolean): Promise<Session>;
}

/** The testing credentials for the prototype. */
export const PROTOTYPE_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: '123456',
} as const;

const PROTOTYPE_USER: User = {
  id: 'USR-001',
  name: 'System Administrator',
  email: PROTOTYPE_CREDENTIALS.email,
  role: 'Admin',
  initials: 'SA',
  avatarUrl: null,
  jobTitle: 'System Administrator',
  department: 'Information Technology',
};

/**
 * Every permission the portal checks, so the administrator can open every module.
 * Listed explicitly rather than relying on a wildcard so `can()` reads naturally in
 * the permissions screens.
 */
const PROTOTYPE_PERMISSIONS: readonly string[] = [
  ...PERMISSIONS,
  'customers.read',
  'customers.create',
  'customers.approve',
  'orders.read',
  'orders.create',
  'orders.approve',
  'promotions.configure',
  'users.create_representative',
  'visits.read',
  'visits.readall',
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The administrator as User Management currently has them, so a name or avatar
 * changed on the Profile page is what the header shows after the next sign-in.
 */
function currentUser(): User {
  const record = userRecords().find((u) => u.id === PROTOTYPE_USER.id);
  if (!record) return PROTOTYPE_USER;
  const name = record.full_name || PROTOTYPE_USER.name;
  return {
    ...PROTOTYPE_USER,
    name,
    initials: initialsFrom(name),
    avatarUrl: record.avatar_url ?? null,
    jobTitle: record.position || PROTOTYPE_USER.jobTitle,
  };
}

/** Eight hours — a working day. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function issueSession(persistent: boolean): Session {
  const issuedAt = Date.now();
  return {
    user: currentUser(),
    // Stands in for a JWT. Opaque to every consumer, exactly like a real one.
    token: `prototype.${btoa(`${PROTOTYPE_USER.id}:${issuedAt}`)}`,
    tokenType: 'Bearer',
    refreshToken: null,
    permissions: PROTOTYPE_PERMISSIONS,
    sessionId: `SES-${issuedAt.toString(36)}`,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_MS,
    persistent,
  };
}

export class MockAuthRepository implements AuthRepository {
  async signIn({ email, password, remember }: Credentials): Promise<Session> {
    // Keeps the sign-in button's pending state visible, as a network call would.
    await mockDelay(700);

    const emailMatches = email.trim().toLowerCase() === PROTOTYPE_CREDENTIALS.email;
    // Same error for an unknown email and a wrong password, as a real server would.
    if (!emailMatches || password !== PROTOTYPE_CREDENTIALS.password) {
      throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
    }
    return issueSession(remember);
  }

  async signOut(_session: Session | null): Promise<void> {
    await mockDelay(150);
  }

  async verify(session: Session): Promise<Session | null> {
    if (session.expiresAt <= Date.now()) return null;
    if (session.user.id !== PROTOTYPE_USER.id) return null;
    return { ...session, user: currentUser(), permissions: PROTOTYPE_PERMISSIONS };
  }

  async refresh(_refreshToken: string, _persistent: boolean): Promise<Session> {
    throw new AuthError('session_expired', 'Your session expired. Please sign in again.');
  }
}

export const authRepository: AuthRepository = new MockAuthRepository();
