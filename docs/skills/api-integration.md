# API integration

## Status: no backend contract exists yet

No endpoint path, DTO, pagination shape, or error schema has been assumed
anywhere in this codebase. `src/config/environment.ts` reads
`NEXT_PUBLIC_API_BASE_URL`; when it is unset, `ApiClient` raises a
`configuration` error at request time rather than guessing a URL. That failure
is deliberate — an invented endpoint that silently 404s is much harder to debug
than a loud "you have not configured this yet".

When Swagger/OpenAPI arrives, generate DTO types from it. Do not hand-write
them from a sample response.

## The layers

```
component → hook → repository → ApiClient → backend
```

`ApiClient` (`src/infrastructure/api/client.ts`) owns base URL, bearer token, JSON handling,
timeouts, abort, correlation IDs, and error normalization. It knows **no
endpoint paths** — those belong to the repository that calls it. Feature code
must never call `fetch()` directly.

The one exception is `src/infrastructure/auth/repository.ts`: the OAuth2 token
endpoint is form-encoded and must not carry a bearer header, so it owns its own
request. It is still inside `infrastructure/`.

## Errors

`src/domain/errors/api-error.ts` maps HTTP status to a normalized `ApiError` with a stable
`kind` (`unauthorized`, `not_found`, `validation`, `network`, `timeout`, …) and
a `messageKey` like `api.error.timeout`. UI renders the translated key.

Raw backend messages are never rendered by default: they leak implementation
detail and are not translated. `details` is retained on the error for
feature-specific field mapping (e.g. mapping a 422 onto form fields), not for
display.

## Recipe: putting a feature behind a repository

Worked examples to copy: `src/features/customers/repositories/` (single resource) and
`src/features/users/repositories/` (several related resources).

**1. Define the contract** in `src/features/<feature>/repositories/types.ts`. Extend
`CrudRepository` or `ReadRepository` from `@/infrastructure/repositories/types` when the shape fits, and
add feature-specific operations as extra methods:

```ts
export interface ProductRepository
  extends ReadRepository<Product, ProductListQuery> {
  adjustStock(id: string, delta: number): Promise<void>;
}
```

Use `PageResult<T>` for collections even when the mock returns everything at
once. A real list endpoint will be paginated, and callers that already destructure
`.items` will not need changing.

**2. Write the mock adapter** in
`src/features/<feature>/repositories/mock-<feature>-repository.ts`. It should delegate to
the existing demo data and add no behavior of its own. Filtering that pages
currently do client-side belongs here, so the eventual API adapter can move that
work server-side invisibly.

Mutations the demo cannot honestly perform should `throw`, not fake success —
see `MockCustomerRepository.create()`.

**3. Bind it** in `src/features/<feature>/repositories/index.ts`, and re-export it
from the feature barrel `src/features/<feature>/index.ts`:

```ts
export const productsRepository: ProductRepository = new MockProductRepository();
```

This line is the entire swap surface. Export the types too, so pages import from
the feature root rather than reaching into internal files.

**4. Rewire the pages** to import the binding instead of the demo module. Pair
with `useRepositoryQuery` for read paths so loading, error, and retry states come
for free:

```ts
const load = useCallback((signal: AbortSignal) => productsRepository.list({}, signal), []);
const { data, error, isLoading, refetch } = useRepositoryQuery(['products'], load);
```

`load` must be memoized with `useCallback` — the hook depends on its identity,
and an inline arrow re-fetches on every render.

**5. Verify** with `npm run typecheck && npm run lint && npm run build`, then
confirm the feature's demo data module no longer appears in
`grep -rn "/data/" src/app`.

## When the real API lands

Add `Api<Feature>Repository` next to the mock, implementing the same interface:
call `apiClient.get()` with the real path, then map the DTO to the frontend model
before returning. Change the binding in `index.ts`. Keep the mock adapter — it is
useful for offline demos and tests.

The mapper is the seam that protects the UI from backend renames. Put it in
`src/features/<feature>/repositories/mappers.ts` and keep it a pure function.
