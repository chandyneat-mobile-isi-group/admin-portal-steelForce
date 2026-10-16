import type { PageResult } from '@/infrastructure/repositories/types';
import { createPersistentStore, mockDelay, mockResolve, paginate } from '@/services/mock';
import { buildSessions } from './data/sessions';
import type { AdminSession, AdminSessionQuery } from './types';

/** The device fleet, persisted so a revoked session stays revoked across a refresh. */
const sessionsStore = createPersistentStore<AdminSession[]>('sessions.fleet', buildSessions);

/**
 * The signed-in device fleet — a local mock in the prototype.
 *
 * Same contract the screen was written against: paged list with search, status and
 * rep filters, and a revoke that marks the session ended.
 */
export const adminSessionsRepository = {
  async list(query: AdminSessionQuery = {}, signal?: AbortSignal): Promise<PageResult<AdminSession>> {
    const pageNumber = query.pageNumber ?? 1;
    const pageSize = query.pageSize ?? 50;
    const search = query.search?.trim().toLowerCase();

    const rows = sessionsStore
      .get()
      .filter((s) => query.includeRevoked || !s.revokedAt)
      .filter((s) => !query.status || s.status === query.status)
      .filter((s) => !query.repId || s.repId === query.repId)
      .filter(
        (s) =>
          !search ||
          `${s.repName} ${s.repEmployeeCode ?? ''} ${s.device.model ?? ''} ${s.device.os ?? ''}`
            .toLowerCase()
            .includes(search)
      )
      .sort((a, b) => Date.parse(b.lastActive) - Date.parse(a.lastActive));

    const page = paginate(rows, pageNumber, pageSize);
    return mockResolve(
      {
        items: page.items,
        total: page.total,
        nextCursor: page.page < page.totalPages ? String(page.page + 1) : null,
      },
      signal
    );
  },

  /**
   * Ends one device.
   *
   * In production this stopped the session renewing, locking the device out within
   * the access token's remaining lifetime. Here it marks the row revoked at once.
   *
   * Idempotent: revoking an already-revoked session succeeds and changes nothing.
   */
  async revoke(sessionId: string, _reason?: string, signal?: AbortSignal): Promise<AdminSession> {
    await mockDelay(undefined, signal);
    let revoked: AdminSession | undefined;
    sessionsStore.update((current) =>
      current.map((s) => {
        if (s.id !== sessionId) return s;
        revoked = s.revokedAt ? s : { ...s, status: 'revoked', revokedAt: new Date().toISOString() };
        return revoked;
      })
    );
    if (!revoked) throw Object.assign(new Error('Session not found.'), { status: 404 });
    return revoked;
  },
};
