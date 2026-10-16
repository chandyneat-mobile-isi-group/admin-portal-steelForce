---
name: api-integration
description: Integrate REST/GraphQL/third-party APIs into web apps — typed API clients, zod validation, TanStack Query for client caching, retries with backoff, timeouts, pagination, optimistic updates, error mapping, idempotency, and API route design. Use this skill whenever the user fetches data, calls an external/backend API, builds an API client or SDK wrapper, designs endpoints, handles pagination, or wires up React Query/SWR.
---

# API Integration

A good integration is typed end to end, validated at runtime, resilient to failure, and cached intentionally.

## Layering
```
lib/http.ts          → fetch wrapper (timeout, retries, auth, error mapping)
features/x/api.ts    → typed endpoint functions using schemas
features/x/hooks.ts  → TanStack Query hooks (client) 
features/x/queries.ts→ server-side calls (Server Components)
```

## Fetch wrapper
```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
type Opts = RequestInit & { timeoutMs?: number; retries?: number };

export async function http<T>(url: string, schema: z.ZodType<T>, { timeoutMs = 10_000, retries = 2, ...init }: Opts = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ?? ctrl.signal, headers: { "Content-Type": "application/json", ...init.headers } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new ApiError(res.status, body.code ?? "HTTP_ERROR", body.message ?? res.statusText, body);
        if (attempt < retries && (res.status >= 500 || res.status === 429) && isIdempotent(init.method)) {
          await sleep(backoff(attempt, res.headers.get("retry-after"))); continue;
        }
        throw err;
      }
      if (res.status === 204) return undefined as T;
      return schema.parse(await res.json());
    } catch (e) {
      if (e instanceof ApiError || attempt >= retries || !isIdempotent(init.method)) throw e;
      await sleep(backoff(attempt));
    } finally { clearTimeout(t); }
  }
}
const isIdempotent = (m = "GET") => ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"].includes(m.toUpperCase());
const backoff = (n: number, ra?: string | null) => ra ? Number(ra) * 1000 : Math.min(8000, 300 * 2 ** n) + Math.random() * 200;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```
Never retry non-idempotent POSTs unless they carry an `Idempotency-Key`.

## Typed endpoints
```ts
const Page = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export const listOrders = (cursor?: string) =>
  http(`${API}/orders?limit=50${cursor ? `&cursor=${cursor}` : ""}`, Page(OrderSchema));
```
Generate clients from OpenAPI (`openapi-typescript` + `openapi-fetch`) or use tRPC when you own both ends.

## TanStack Query
```ts
export const orderKeys = { all: ["orders"] as const, list: (f: Filters) => [...orderKeys.all, "list", f] as const, detail: (id: string) => [...orderKeys.all, id] as const };

export function useOrders(f: Filters) {
  return useInfiniteQuery({
    queryKey: orderKeys.list(f),
    queryFn: ({ pageParam, signal }) => listOrders(pageParam, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
```
QueryClient defaults: `staleTime` ≥ 30s for most data, `retry` skip 4xx, `refetchOnWindowFocus` as appropriate.

### Optimistic update
```ts
useMutation({
  mutationFn: updateOrder,
  onMutate: async (next) => {
    await qc.cancelQueries({ queryKey: orderKeys.detail(next.id) });
    const prev = qc.getQueryData(orderKeys.detail(next.id));
    qc.setQueryData(orderKeys.detail(next.id), (old: Order) => ({ ...old, ...next }));
    return { prev };
  },
  onError: (_e, next, ctx) => qc.setQueryData(orderKeys.detail(next.id), ctx?.prev),
  onSettled: (_d, _e, next) => qc.invalidateQueries({ queryKey: orderKeys.detail(next.id) }),
});
```
Hydrate server-fetched data with `HydrationBoundary` to avoid double fetching.

## Designing your own API
- Resource nouns, plural: `GET /orders`, `POST /orders`, `PATCH /orders/:id`.
- Cursor pagination for large/changing sets; `limit` capped.
- Consistent error envelope: `{ code, message, details?, requestId }`.
- Correct status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 422, 429, 5xx.
- Version (`/v1`) for public APIs; `Idempotency-Key` on create/payment endpoints.
- Validate inputs, authorize, rate limit, log `requestId`.

## Third-party APIs
- Keep keys server-side; proxy through Route Handlers/Server Actions.
- Wrap vendor SDKs behind your own interface (swappable, mockable).
- Circuit-break or degrade gracefully when the vendor is down.
- Cache responses where license allows; respect rate limits.

## Checklist
- [ ] Timeouts + abort signals on every request
- [ ] Responses validated with schemas
- [ ] Retries only on idempotent / keyed requests
- [ ] Query keys structured via factory
- [ ] Errors mapped to user-friendly messages
- [ ] Secrets never reach the client
- [ ] MSW mocks for tests
