'use client';

/**
 * A log of call plan imports, kept in this browser.
 *
 * Each upload is recorded here as it finishes, in the prototype's persisted mock
 * store (seeded with a few earlier uploads), so it survives reloads and is cleared by
 * Reset demo data. It is per browser: a colleague's imports do not appear.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPersistentStore, mockId } from '@/services/mock';
import { sessionStore } from '@/infrastructure/storage/session-store';
import type { ImportResultDto } from './api';
import { seedHistory } from './data/directory';

export type ImportOutcome = 'Imported' | 'Refused' | 'Failed';

export interface ImportHistoryEntry {
  id: string;
  at: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  outcome: ImportOutcome;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  routesCreated: number;
  stopsCreated: number;
  /** The server's message when the request itself failed. */
  message?: string;
}

const LIMIT = 200;
const EVENT = 'call-plan-import-history';

const historyStore = createPersistentStore<ImportHistoryEntry[]>('depot-assignments.history', () =>
  seedHistory.map((e) => ({ ...e }))
);

function read(): ImportHistoryEntry[] {
  return historyStore.get();
}

function write(entries: ImportHistoryEntry[]) {
  historyStore.set(entries.slice(0, LIMIT));
  window.dispatchEvent(new Event(EVENT));
}

/** Records one upload. `result` is null when the request itself failed. */
export function recordImport(file: File, result: ImportResultDto | null, message?: string) {
  const entry: ImportHistoryEntry = {
    id: mockId('IMP'),
    at: new Date().toISOString(),
    fileName: file.name,
    fileSize: file.size,
    uploadedBy: sessionStore.read()?.user.name ?? 'Unknown',
    outcome: !result ? 'Failed' : result.imported ? 'Imported' : 'Refused',
    totalRows: result?.totalRows ?? 0,
    successfulRows: result?.successfulRows ?? 0,
    failedRows: result?.failedRows ?? 0,
    routesCreated: result?.routesCreated ?? 0,
    stopsCreated: result?.stopsCreated ?? 0,
    message,
  };
  write([entry, ...read()]);
}

/** The log, newest first, kept in sync across tabs and with new uploads. */
export function useImportHistory() {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const clear = useCallback(() => write([]), []);

  return { entries, clear };
}
