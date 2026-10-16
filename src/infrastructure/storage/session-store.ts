import type { Session } from '@/lib/auth/types';

const SESSION_KEY = 'steelforce.session';
const REMEMBERED_EMAIL_KEY = 'steelforce.remembered-email';

/**
 * Mock session persistence for the static prototype.
 *
 * The session always lives in sessionStorage: it survives navigation and reloads
 * within the tab, and closing the tab signs the tester out, so each demo starts from
 * the login screen. "Remember me" keeps only the email (in localStorage) to prefill
 * the form — the password is never stored anywhere.
 */
function sessionStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const sessionStore = {
  read(): Session | null {
    const store = sessionStorageOrNull();
    if (!store) return null;
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Session;
      if (parsed?.user?.id && parsed?.token && typeof parsed.expiresAt === 'number') {
        return parsed;
      }
      // Malformed payload — drop it rather than fail the whole boot.
      store.removeItem(SESSION_KEY);
    } catch {
      // Storage disabled or JSON corrupt; treat as signed out.
    }
    return null;
  },

  write(session: Session): void {
    const store = sessionStorageOrNull();
    if (!store) return;
    try {
      store.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Private mode: the session simply won't survive a reload.
    }
  },

  clear(): void {
    try {
      sessionStorageOrNull()?.removeItem(SESSION_KEY);
      // Sessions written by earlier builds may sit in localStorage.
      if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to do — the in-memory state is authoritative for this tab.
    }
  },

  /** Email only. The password is never persisted anywhere. */
  readRememberedEmail(): string {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  },

  writeRememberedEmail(email: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Non-fatal.
    }
  },
};
