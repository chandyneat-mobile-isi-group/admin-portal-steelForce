/**
 * Frontend-only service layer for the static prototype.
 *
 * Feature modules keep their own seed data (`features/<module>/data`) and expose the
 * same service/repository contracts the pages already consume; this folder holds the
 * shared plumbing they are built on. Nothing here performs a network request.
 */

export { MOCK_LATENCY_MS, MockAbortError, clone, mockDelay, mockId, mockResolve } from './latency';
export { MOCK_DATA_VERSION, createPersistentStore, resetMockData, type PersistentStore } from './persistent-store';
export { csvBlob, csvFromRecords, fileStamp, pdfBlob } from './files';
export { paginate, type QueryParams } from './query';
