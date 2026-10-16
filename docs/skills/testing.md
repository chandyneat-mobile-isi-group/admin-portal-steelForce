# Testing

## Current state, stated plainly

**There is no test runner configured in this repository.** No Vitest, no Jest,
no Playwright, no test files. `npm run typecheck`, `npm run lint`, and
`npm run build` are the only automated checks that exist today.

This document describes what to test and where the seams are, so that when a
runner is added the work is already shaped for it. Do not read it as a
description of coverage that exists.

## Adding a runner

Vitest plus React Testing Library is the natural fit: it reuses the existing
TypeScript config, and the codebase is already ESM. Add Playwright separately
if end-to-end coverage becomes a requirement — do not try to make one tool do
both jobs.

## What is worth testing, in order

**1. Authorization logic.** `authorizeRoute()` (`src/lib/auth/`) and the
`hasPermission` family (`src/domain/permissions/`)
are pure functions with high blast radius. Cover longest-prefix matching, and
specifically cover that an unmapped protected route is denied — that default is
a security property and a regression in it would be silent.

**2. Mappers, once DTOs exist.** Pure functions, trivially testable, and the
place a backend rename will surface. Currently there are no mappers because
there is no wire format; this becomes priority one the day there is.

**3. Repositories against their interface.** Write the suite against the
interface, then run it against both the mock and the API adapter. The two must
be behaviorally interchangeable — that is the entire premise of the pattern, and
an untested premise tends to be false.

**4. Critical workflows** as component or E2E tests: login and session expiry,
customer creation, quotation approval, order creation, user creation and role
assignment.

**5. Reducers.** `authReducer` and the planning store reducer are pure and
handle state machines where an invalid transition is a real bug.

## What not to test

Presentational components with no logic, shadcn primitives (upstream's job), and
demo data generators. Chasing a coverage percentage produces tests that assert
the implementation back to itself and then break on every refactor.

## Testability the architecture already provides

The repository interface is the main seam: a component test injects a stub
repository and never touches the network. `useRepositoryQuery` takes a `load`
function, so it can be tested with a plain promise. Everything in `src/domain/` is
framework-independent and needs no React test environment.

Keep it that way — logic that can only be reached by rendering a page is logic
that will not get tested.
