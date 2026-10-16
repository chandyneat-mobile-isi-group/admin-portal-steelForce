# 004 — A small server-state hook instead of a query library

**Status:** Accepted · **Date:** 2026-08-11

## Context

Repository reads need loading, error, retry, and cancellation. The default
answer is TanStack Query.

But the portal currently reads from in-memory mock data with a simulated 220ms
delay. There is no network, so there is nothing to cache, deduplicate, or
refetch in the background. Adding a query library now would mean adopting its
cache-key conventions, invalidation model, and devtools to solve problems the
app does not yet have — and those conventions are hard to unwind once features
are written against them.

The failure that *is* real even with mock data: a slow request landing after a
fast one and overwriting fresher state.

## Decision

`hooks/use-repository-query.ts`, ~60 lines. It handles cancellation on unmount
and discards responses from superseded requests, and exposes
`{ data, error, isLoading, isRefreshing, refetch }`.

It does **not** cache, deduplicate, or refetch in the background.

It is explicitly a seam. Its signature — a key array plus a
`(signal) => Promise<T>` loader — is deliberately TanStack-shaped, so adopting
the library later is a change inside the hook, not across features.

## Consequences

No dependency, and behavior a reader can verify by reading the file. Real
cancellation semantics from day one.

Two components reading the same data fetch it twice. With mock data that is
free; with a real API it is the trigger to revisit this decision. Callers must
memoize `load` with `useCallback`, since the hook depends on its identity — an
inline arrow refetches every render. That is a sharp edge, noted in
`api-integration.md`.

## Revisit when

Any of: duplicate in-flight requests become measurable; screens need background
refresh; optimistic updates with rollback are required; or cache invalidation
across features becomes manual bookkeeping.

At that point adopt TanStack Query behind the same interface. Do not build these
features into this hook — reimplementing a query library badly is the outcome
this decision is meant to avoid.

## Alternatives rejected

**TanStack Query now** — real cost, no current benefit, conventions that are
hard to reverse.

**useEffect in each component** — the stale-response bug, re-derived per page.

**Redux/Zustand for server data** — conflates server state with UI state and
requires hand-written cache invalidation.
