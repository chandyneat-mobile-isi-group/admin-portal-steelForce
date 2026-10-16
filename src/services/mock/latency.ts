/**
 * Simulated network latency for the static prototype.
 *
 * Every mock service awaits this so loading skeletons, pending buttons and
 * optimistic states are actually seen, exactly as they would be against a server.
 * Honours an `AbortSignal` so a cancelled query settles the same way a cancelled
 * request would.
 */

export const MOCK_LATENCY_MS = 280;

export class MockAbortError extends Error {
  readonly status = 0;
  readonly kind = 'aborted';
  constructor() {
    super('The request was cancelled.');
    this.name = 'AbortError';
  }
}

export function mockDelay(ms: number = MOCK_LATENCY_MS, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new MockAbortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new MockAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Resolves with a deep copy of `value` after the simulated latency. */
export async function mockResolve<T>(value: T, signal?: AbortSignal, ms?: number): Promise<T> {
  await mockDelay(ms, signal);
  return clone(value);
}

/**
 * Callers get copies, never the store's own objects — a component mutating what it
 * received must not silently edit the "database".
 */
export function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

let sequence = 0;

/** Readable, collision-free ids for records created in the prototype. */
export function mockId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}${sequence.toString(36)}`;
}
