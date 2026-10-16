'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { authRepository } from '@/infrastructure/auth/repository';
import { sessionStore } from '@/infrastructure/storage/session-store';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/domain/permissions';
import {
  AuthError,
  type AuthEvent,
  type AuthFailureReason,
  type AuthState,
  type Credentials,
  type Permission,
  type Role,
  type Session,
} from './types';

/** Refresh this long before the access token's real expiry, never at the deadline. */
const REFRESH_SKEW_MS = 60_000;
const EMPTY_PERMISSIONS: readonly Permission[] = [];

/**
 * Authentication state machine — the Bloc, expressed as a reducer.
 *
 * Transitions are explicit and exhaustive so no code path can leave the app in
 * a half-authenticated state. `initializing` is the entry state: the portal
 * renders nothing until it resolves, which is what prevents a dashboard flash.
 */
export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'restore.started':
      return { status: 'initializing', session: null, error: null };
    case 'restore.succeeded':
    case 'login.succeeded':
      return { status: 'authenticated', session: event.session, error: null };
    case 'session.refreshed':
      // A silent refresh never changes which state we're in, only the token.
      return state.status === 'authenticated' ? { status: 'authenticated', session: event.session, error: null } : state;
    case 'restore.failed':
      return { status: 'unauthenticated', session: null, error: null };
    case 'login.started':
      return { status: 'authenticating', session: null, error: null };
    case 'login.failed':
      return { status: 'unauthenticated', session: null, error: event.reason };
    case 'logout':
      return { status: 'unauthenticated', session: null, error: null };
    case 'user.updated':
      if (state.status === 'authenticated') {
        return {
          ...state,
          session: {
            ...state.session,
            user: { ...state.session.user, ...event.user },
          },
        };
      }
      return state;
    case 'error.cleared':
      return state.status === 'unauthenticated' ? { ...state, error: null } : state;
    default:
      return state;
  }
}

const INITIAL_STATE: AuthState = { status: 'initializing', session: null, error: null };

interface AuthContextValue {
  status: AuthState['status'];
  session: Session | null;
  error: AuthFailureReason | null;
  user: Session['user'] | null;
  role: Role | null;
  /** Effective permissions for the current session — `isi:permission` claims, decoded. */
  permissions: readonly Permission[];
  isAuthenticated: boolean;
  /** True until the stored session has been read and verified. */
  isInitializing: boolean;

  signIn: (credentials: Credentials) => Promise<Session | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<Session['user']>) => void;

  /** Centralised permission checks — never compare roles in a component. */
  can: (permission: Permission) => boolean;
  canAny: (permissions: readonly Permission[]) => boolean;
  canAll: (permissions: readonly Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;

  rememberedEmail: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const sessionTimer = useRef<number | null>(null);

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = sessionStore.read();
      if (!stored) {
        if (!cancelled) dispatch({ type: 'restore.failed' });
        return;
      }
      try {
        // Rejects an expired or foreign session — see MockAuthRepository.verify.
        const verified = await authRepository.verify(stored);
        if (cancelled) return;
        if (!verified) {
          sessionStore.clear();
          dispatch({ type: 'restore.failed' });
          return;
        }
        sessionStore.write(verified);
        dispatch({ type: 'restore.succeeded', session: verified });
      } catch {
        if (cancelled) return;
        sessionStore.clear();
        dispatch({ type: 'restore.failed' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the session alive in-tab: silently refresh shortly before the access
  // token expires when we hold a refresh token, otherwise sign out at expiry
  // rather than waiting for the next page load to notice.
  useEffect(() => {
    if (sessionTimer.current) window.clearTimeout(sessionTimer.current);
    if (state.status !== 'authenticated') return;

    const session = state.session;
    const canRefresh = Boolean(session.refreshToken);
    const fireAt = canRefresh ? session.expiresAt - REFRESH_SKEW_MS : session.expiresAt;
    const delay = fireAt - Date.now();

    const onFire = async () => {
      if (canRefresh) {
        try {
          const refreshed = await authRepository.refresh(session.refreshToken!, session.persistent);
          sessionStore.write(refreshed);
          dispatch({ type: 'session.refreshed', session: refreshed });
          return;
        } catch {
          // Refresh failed (expired/reused/revoked family) — fall through to sign-out.
        }
      }
      sessionStore.clear();
      dispatch({ type: 'login.failed', reason: 'session_expired' });
    };

    if (delay <= 0) {
      onFire();
    } else {
      // setTimeout saturates above ~24.8 days; sessions are far shorter, but
      // clamping keeps the behaviour correct if a TTL is ever raised.
      sessionTimer.current = window.setTimeout(onFire, Math.min(delay, 2_147_483_647));
    }

    return () => {
      if (sessionTimer.current) window.clearTimeout(sessionTimer.current);
    };
  }, [state]);

  const signIn = useCallback(async (credentials: Credentials) => {
    dispatch({ type: 'login.started' });
    try {
      const session = await authRepository.signIn(credentials);
      sessionStore.write(session);
      sessionStore.writeRememberedEmail(credentials.remember ? session.user.email : null);
      dispatch({ type: 'login.succeeded', session });
      return session;
    } catch (error) {
      const reason = error instanceof AuthError ? error.reason : 'unknown';
      dispatch({ type: 'login.failed', reason });
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    const current = state.status === 'authenticated' ? state.session : null;
    sessionStore.clear();
    dispatch({ type: 'logout' });
    await authRepository.signOut(current);
  }, [state]);

  const clearError = useCallback(() => dispatch({ type: 'error.cleared' }), []);

  const updateUser = useCallback((user: Partial<Session['user']>) => {
    dispatch({ type: 'user.updated', user });
    const current = sessionStore.read();
    if (current) {
      sessionStore.write({ ...current, user: { ...current.user, ...user } });
    }
  }, []);

  const role = state.status === 'authenticated' ? state.session.user.role : null;
  const permissions = state.status === 'authenticated' ? state.session.permissions : EMPTY_PERMISSIONS;

  const value = useMemo<AuthContextValue>(() => {
    return {
      status: state.status,
      session: state.session,
      error: state.error,
      user: state.status === 'authenticated' ? state.session.user : null,
      role,
      permissions,
      isAuthenticated: state.status === 'authenticated',
      isInitializing: state.status === 'initializing',
      signIn,
      signOut,
      clearError,
      updateUser,
      can: (permission) => hasPermission(permissions, permission),
      canAny: (required) => hasAnyPermission(permissions, required),
      canAll: (required) => hasAllPermissions(permissions, required),
      hasRole: (...roles) => (role ? roles.includes(role) : false),
      rememberedEmail: sessionStore.readRememberedEmail(),
    };
  }, [state, role, permissions, signIn, signOut, clearError, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
