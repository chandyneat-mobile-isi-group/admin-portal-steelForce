/**
 * Query-string-shaped parameters, the mock replacement for the old `ApiQuery`. Hooks
 * that built a request query keep the same shape and hand it to a mock service.
 */
export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

/** Page/pageSize slicing with totals, matching what the list endpoints returned. */
export function paginate<T>(
  rows: readonly T[],
  page = 1,
  pageSize = 20
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;
  return { items: rows.slice(start, start + size), total: rows.length, page: current, pageSize: size, totalPages };
}
