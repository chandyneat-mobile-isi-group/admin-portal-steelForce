# 001 — Repository pattern for data access

**Status:** Accepted · **Date:** 2026-08-11
> **Note:** paths in this record predate the `src/` restructure — see
> [ADR 006](./006-src-feature-oriented-structure.md) for the current locations.

## Context

The portal ships with no backend. Demo records live in `lib/mock-data.ts`,
`lib/data/*`, and `lib/planning/demo-data.ts`, and pages imported them directly —
around 50 import sites across `app/` and `components/`.

That works until the API arrives. Then every one of those pages needs rewriting,
each rewrite is an opportunity to change behavior by accident, and the rewrites
cannot be staged: a page either uses mock data or it does not.

## Decision

Put data access behind a repository interface per feature.

- `lib/repositories/types.ts` — `ListQuery`, `PageResult<T>`, `ReadRepository`,
  `CrudRepository`
- `lib/repositories/<feature>/types.ts` — the feature's contract
- `lib/repositories/<feature>/mock-*.ts` — adapter over existing demo data
- `lib/repositories/<feature>/index.ts` — the binding, and the whole swap surface

Pagination is expressed as `PageResult<T>` even where the mock returns
everything at once, so callers already destructure `.items` and will not change
when a real endpoint paginates.

Mock adapters throw on operations the demo cannot honestly perform rather than
faking success. A fake success teaches the UI a lie about what the backend does.

## Consequences

Swapping to a real API is one line per feature. Features migrate independently,
so the transition can be staged. Repositories can be stubbed in tests without a
network.

The cost is one interface plus one adapter per feature, and read call sites
gained a `.items` hop. For features that are pure presentation of static demo
content this would be overhead — which is why the migration is incremental and
listed as a backlog in `architecture.md` rather than applied everywhere at once.

## Alternatives rejected

**Direct fetch in components** — the coupling this exists to prevent.

**One generic `DataService`** — turns into a god object with a method per
feature, and every feature's changes touch one shared file.

**Waiting for the API contract** — the cost of the coupling grows with every
page added in the meantime, and the interface does not depend on knowing the
wire format.
