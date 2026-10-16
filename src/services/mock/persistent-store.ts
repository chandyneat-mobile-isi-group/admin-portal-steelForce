import { clone } from './latency';

/**
 * localStorage-backed collections for the static prototype.
 *
 * Records a tester creates, edits or deletes survive a page refresh, so a demo can
 * move between screens and come back to the same state. Every key is namespaced
 * under `steelforce.mock.` and stamped with `MOCK_DATA_VERSION`; bumping the version
 * discards stale shapes rather than crashing on them. `resetMockData()` (Settings →
 * Reset demo data) restores the seed for a fresh session.
 *
 * Storage failures (private mode, quota) degrade to in-memory state for the tab.
 */

const PREFIX = 'steelforce.mock.';
export const MOCK_DATA_VERSION = 1;

interface Envelope<T> {
  v: number;
  data: T;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readKey<T>(key: string): T | undefined {
  const store = storage();
  if (!store) return undefined;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed?.v !== MOCK_DATA_VERSION) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}

function writeKey<T>(key: string, data: T): void {
  const store = storage();
  if (!store) return;
  try {
    const envelope: Envelope<T> = { v: MOCK_DATA_VERSION, data };
    store.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Quota or private mode — the in-memory copy stays authoritative for this tab.
  }
}

export interface PersistentStore<T> {
  /** Current value. Lazily hydrated from storage on first read in the browser. */
  get(): T;
  /** Replaces the value and persists it. */
  set(next: T): void;
  /** Applies `fn` to a copy of the current value, persists and returns the result. */
  update(fn: (current: T) => T): T;
  /** Restores the seed. */
  reset(): void;
}

const registry = new Set<PersistentStore<unknown>>();

/**
 * A single persisted value — usually an array of records. `seed` is a factory so
 * date-relative mock data is computed at first use, not at import time.
 */
export function createPersistentStore<T>(key: string, seed: () => T): PersistentStore<T> {
  let value: T | undefined;
  let hydrated = false;

  const ensure = (): T => {
    // On the server there is no storage; never cache, so the client hydrates properly.
    if (typeof window === 'undefined') return value ?? seed();
    if (!hydrated) {
      hydrated = true;
      const stored = readKey<T>(key);
      value = stored !== undefined ? stored : seed();
    }
    return value as T;
  };

  const store: PersistentStore<T> = {
    get: ensure,
    set(next) {
      value = next;
      hydrated = true;
      writeKey(key, next);
    },
    update(fn) {
      const next = fn(clone(ensure()));
      store.set(next);
      return next;
    },
    reset() {
      value = seed();
      hydrated = true;
      try {
        storage()?.removeItem(PREFIX + key);
      } catch {
        // Nothing to do.
      }
    },
  };

  registry.add(store as PersistentStore<unknown>);
  return store;
}

/** Clears every persisted mock collection and restores the seeds. */
export function resetMockData(): void {
  registry.forEach((store) => store.reset());
  const store = storage();
  if (!store) return;
  try {
    Object.keys(store)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => store.removeItem(key));
  } catch {
    // Nothing more to do.
  }
}
