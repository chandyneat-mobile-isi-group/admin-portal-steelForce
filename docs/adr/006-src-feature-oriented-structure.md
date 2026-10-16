# 006 — Move to `src/` with a feature-oriented layered structure

**Status:** Accepted · **Date:** 2026-08-11

## Context

The portal used the flat Next.js convention: top-level `app/`, `components/`,
`hooks/`, `lib/`. It worked, but three problems had become visible.

**Feature code had no home.** Customer code lived in four places — the route in
`app/(portal)/customers/`, components in `components/customers/`, demo data in
`lib/data/crm.ts`, the repository in `lib/repositories/customers/`. Answering
"where does customer code live" required knowing the whole tree.

**`lib/` had become a catch-all.** It held transport, auth, demo data, i18n,
navigation config, domain types, and utilities — seven unrelated concerns under
one name, with no rule about what belonged there next.

**Layer violations were invisible.** Nothing distinguished framework-free
business rules from React code, so there was no boundary to check. The
restructure surfaced two real ones that had gone unnoticed: seven shared
components imported an easing constant from inside the planning feature, and
the shared `Header` imported `ProfileMenu` from the auth feature.

A previous session had argued against this move on the grounds that it rewrites
every import for no behavioral gain. The project owner reaffirmed the request.
That is their call to make — and the two violations found during the work
showed the flat layout had been hiding coupling, which is a gain the earlier
argument did not account for.

## Decision

Move everything under `src/`, organized as:

```
app/  features/  components/  hooks/  lib/  infrastructure/  domain/  config/  locales/
```

with dependencies flowing `app → features → components → hooks → lib →
infrastructure → domain`, and `config/` readable from anywhere.

Specific placements worth recording:

- **`domain/`** holds only framework-free code — entities, enums, errors, and
  pure permission checks. It imports no React, Next, transport, or UI.
- **`infrastructure/`** is everything that talks to the outside: `ApiClient`,
  repository base contracts, the OAuth2 auth repository, and browser storage.
- **`config/environment.ts` is the only module that reads `process.env`.** The
  auth repository and the maps loader previously read it directly.
- **Each feature exposes an `index.ts`.** Routes import `@/features/customers`,
  never a path inside it.
- `EASE` moved from `features/planning/lib/tokens.ts` to
  `lib/utilities/motion.ts`, and `ProfileMenu` became a slot on `HeaderProps`,
  removing both shared-UI-to-feature dependencies.

## Consequences

Feature ownership is now a directory, which is what makes parallel work by
several developers safe. Layer violations are greppable, and three invariants
are checked in the contributing checklist: no `@/features/` inside
`src/components/`, no `process.env` outside `src/config/`, no `fetch()` outside
`src/infrastructure/api/`.

The cost was real: ~190 files moved, every `@/` import rewritten, and five
modules split because they spanned layers (`lib/types.ts`, `lib/auth/types.ts`,
`lib/auth/permissions.ts`, `lib/api/config.ts`, `lib/data/seed.ts`).
Typecheck, lint, and build pass, and First Load JS is unchanged at 79.5 kB
shared.

`sideEffects: ["*.css"]` was added to `package.json` so the new feature barrels
tree-shake. Without it webpack must assume every module has import-time side
effects, and `export *` barrels would have pulled whole features into routes
that use one symbol.

## Deviations from the requested tree

Two, both deliberate:

- **`src/hooks/` was kept** although the sketch has no top-level `hooks/`. It
  holds genuinely cross-feature React hooks, `components.json` already aliases
  it, and the alternative buries hooks in `lib/utilities/`.
- **`features/` matches the app, not the sketch.** The sketch lists
  `dashboard`, `sales-reps`, `visits`, `orders`, `quotations`, `notifications`,
  `roles`, `profile`; those routes currently have no extractable feature code —
  they are self-contained pages. Creating empty directories for them would be
  clutter. Conversely `planning`, `field`, `reports`, and `auth` are real
  features with substantial code and got directories. A feature folder appears
  when there is code to put in it.

## Alternatives rejected

**Keep the flat layout** — the position taken before the owner reaffirmed the
request. It remains true that the rules matter more than the directory names,
but the layout was hiding two coupling violations.

**Move files without splitting the cross-layer modules** — would have left
`lib/types.ts` exporting both domain entities and permission enums, which is
the catch-all problem reproduced one level down.
