# Contributing

Code style rules live in [`cleancode_standart.md`](../cleancode_standart.md).
This page covers workflow.

## Before you push

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass. If the dev server is running, build to a separate directory
so the two do not fight over `.next`:

```bash
NEXT_DIST_DIR=.next-prod npm run build
```

## Adding a feature

1. Define types and a repository contract in `src/features/<feature>/repositories/`.
2. Add the route under `src/app/(portal)/<feature>/page.tsx`, kept thin.
3. Add a `ROUTE_RULES` entry (`src/config/permissions.ts`) and its permission
   **in the same change** — an
   unmapped protected route is denied, so a missing rule is a broken page, and
   the default exists so that a new route cannot leak by omission.
4. Add navigation in `src/config/navigation.ts`, deriving visibility from permissions.
5. Build components in `src/features/<feature>/components/` and export the
   public ones from the feature `index.ts`. Reuse `src/components/` patterns
   rather than reinventing tables and headers.
6. Add **both** `en` and `km` translation keys. No hardcoded user-facing text —
   including validation messages, empty states, and error copy.
7. Handle loading, empty, error, and forbidden states. `components/shared/feedback.tsx`
   and `skeletons.tsx` already provide these.

## Review checklist

- No `fetch()` outside `src/infrastructure/` (feature code calls a repository)
- No `process.env` outside `src/config/environment.ts`
- No `@/features/` import inside `src/components/`
- No deep cross-feature import — go through the feature `index.ts`
- No demo-data import in a route
- No `role === '...'` check — use `can()`
- No new `any`
- Both locales updated
- Light and dark verified
- Mobile viewport verified
- Keyboard reachable, focus visible
- No token, password, or customer PII in a log statement

## Documentation

Update `docs/` when a boundary or rule changes; record significant decisions as
an ADR in `docs/adr/`. Trivial choices do not need one — the bar is "a future
maintainer would otherwise undo this without knowing why".

## Knowledge graph

After significant structural change, refresh the codebase graph:

```
/graphify . --update
```

Outputs land in `graphify-out/` (`graph.html`, `GRAPH_REPORT.md`, `graph.json`).
