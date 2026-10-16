import type { Permission, Role } from '../enums/auth';

/** Session identity. Framework-free. */

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Two-letter fallback avatar. */
  initials: string;
  avatarUrl?: string | null;
  jobTitle: string;
  department: string;
}

/**
 * Shape a real OAuth2/OIDC session takes (Authentication.md). `token` is the
 * short-lived (15 min) signed JWT access token; `refreshToken` is the
 * long-lived (14 day, single-use, rotating) refresh token used to obtain a
 * new one silently. `permissions` and `sessionId` are decoded directly from
 * the access token's `isi:permission` and `isi:sid` claims at sign-in/refresh
 * time — they are never independently re-derived from `role`.
 */
export interface Session {
  user: User;
  /** The access token itself — opaque to every consumer except the JWT decoder. */
  token: string;
  tokenType: string;
  /** Absent when the token endpoint was called without the `offline_access` scope. */
  refreshToken: string | null;
  /** Effective permissions at the moment this token was issued (`isi:permission` claims). */
  permissions: readonly Permission[];
  /** `isi:sid` — ties this session to a revocable `user_sessions` row. */
  sessionId: string | null;
  issuedAt: number;
  expiresAt: number;
  /** Remember Me — decides durable vs tab-scoped storage. */
  persistent: boolean;
}

export interface Credentials {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Mirrors the platform's `errorCode` values (Authentication.md, "Error
 * codes"), plus two client-side conditions the backend never sends:
 * `network_error` (the token endpoint was unreachable) and `unknown`.
 */
