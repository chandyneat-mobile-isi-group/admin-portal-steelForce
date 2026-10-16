# State management

Three kinds of state, three different homes. Most bugs in admin portals come
from putting one kind in another's home.

## Server state — data the backend owns

Customers, orders, quotations, visits, notifications, dashboard figures, users.

Fetched through a repository, held by `src/hooks/use-repository-query.ts`:

```ts
const load = useCallback((signal: AbortSignal) => customersRepository.list({ scope: 'assigned' }, signal), []);
const { data, error, isLoading, refetch } = useRepositoryQuery(['customers', 'assigned'], load);
```

The hook handles cancellation on unmount and discards responses from superseded
requests, which is the failure this class of code gets wrong most often: a slow
first request landing after a fast second one and overwriting fresher data.

It does **not** do caching, deduplication, or background refetch. It is
deliberately small and is a seam — if those become real needs, swap in TanStack
Query behind the same call signature without touching repositories or
components. Do not add a global server-state store before then.

Never copy server state into a global store "so other components can see it".
Two components needing the same data should each call the repository; that is
what a cache layer is for when you add one.

## UI state — what this screen is currently doing

Sidebar collapse, open modals, selected rows, filter chips, form drafts, active
tab.

Keep it local with `useState`. Lift only to the nearest common parent that
actually needs it. `src/hooks/use-sidebar.ts` is shared because the shell and the
nav both need it — that is the bar for promoting UI state, not "it might be
useful later".

UI state must never affect business behavior. A collapsed sidebar changes
presentation only.

## Session state — who is signed in

Current user, tokens, permissions, session status.

Centralized in `AuthProvider` (`src/lib/auth/auth-context.tsx`), consumed via
`useAuth()`. There is exactly one auth system; do not build a second one. See
[`authentication.md`](./authentication.md).

## Feature-scoped context

`src/features/planning/store.tsx` is a reducer-backed context for the planning module,
which coordinates a map, a board, and filters across sibling routes. That is a
legitimate use: shared coordination within one feature's route subtree.

It is not a precedent for a global store. Reach for feature context only when
prop drilling crosses three or more levels *and* several sibling routes need
the same working set.
