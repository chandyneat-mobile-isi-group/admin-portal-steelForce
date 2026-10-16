'use client';

import { useSyncExternalStore } from 'react';
import { createPersistentStore, type PersistentStore } from '@/services/mock';

/**
 * A persisted mock collection that components can subscribe to.
 *
 * `createPersistentStore` keeps the data; this adds change notification so two
 * views of the same records — the header bell and the notification centre, a
 * table and its detail drawer — re-render together after a write.
 */
export interface ObservableStore<T> extends PersistentStore<T> {
  subscribe(listener: () => void): () => void;
  /** Stable seed snapshot for the server render and hydration pass. */
  serverSnapshot(): T;
}

export function createObservableStore<T>(key: string, seed: () => T): ObservableStore<T> {
  const inner = createPersistentStore<T>(key, seed);
  const listeners = new Set<() => void>();
  let serverValue: T | undefined;
  const emit = () => listeners.forEach((l) => l());

  return {
    get: () => inner.get(),
    set(next) {
      inner.set(next);
      emit();
    },
    update(fn) {
      const next = inner.update(fn);
      emit();
      return next;
    },
    reset() {
      inner.reset();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    serverSnapshot() {
      if (serverValue === undefined) serverValue = seed();
      return serverValue;
    },
  };
}

/** Reads an observable store and re-renders whenever it changes. */
export function useObservableStore<T>(store: ObservableStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.serverSnapshot);
}
