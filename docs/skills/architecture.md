# Architecture

This document defines the layering contract. It explains **why** the boundaries
exist, not just where files live. For the application map and runtime provider
chain, see [`Achitutere.md`](../Achitutere.md); for the security posture, see
[`Secuirty.md`](../Secuirty.md); for code style, see
[`cleancode_standart.md`](../cleancode_standart.md).

## The one rule

Dependencies point in one direction:

```
src/app/                  routes — thin, composition only
  ↓
src/features/             feature-owned UI, data and repositories
  ↓
src/components/           shared presentation — no data fetching, no feature imports
  ↓
src/hooks/                application state, cancellation, retry
  ↓
src/infrastructure/       ApiClient, repository base contracts, auth, storage
  ↓
src/domain/               entities, enums, errors, permission logic — framework-free
  ↓
SteelForce Backend API
```

`src/config/` sits beside all of it: environment, navigation, route permissions,
and feature flags — values that change without a code change.

Nothing points back up. A repository never imports a component;
`src/infrastructure/` never imports a repository binding; `src/domain/` imports
nothing from any layer above it. If you need an arrow that goes the wrong way, the boundary
is wrong — fix the boundary rather than adding the import.

## Why a repository sits between the page and the transport

The portal has no backend yet. Demo records live under each feature's `data/` folder. The naive approach — importing
those directly into pages — was the dominant pattern in this codebase, and it
has one specific cost: when the API arrives, **every page that imports mock data
has to be rewritten**, and each rewrite is a chance to change behavior by
accident.

A repository interface makes the swap a one-line change at the binding:

```ts
// src/features/customers/repositories/index.ts
export const customersRepository: CustomerRepository = new MockCustomerRepository();
//                                                      ^ becomes ApiCustomerRepository
```

The page does not know or care which implementation it got. This is the
[critical API test](../Achitutere.md): a backend change should touch the
API/repository/mapper layer and stop there.

## What is intentionally NOT abstracted

Abstractions that solve no current problem are a cost, not an asset. This
codebase deliberately does **not** have:

- **A use-case/service class per operation.** Simple CRUD goes hook →
  repository. Add a service only when a workflow coordinates several
  repositories or has real business rules (quotation approval is the likely
  first candidate).
- **A global server-state store.** `src/hooks/use-repository-query.ts` is ~60 lines
  and handles cancellation and stale responses. It is a seam: if caching and
  request deduplication become real needs, it can be replaced by TanStack Query
  without repository or component changes.
- **A separate domain layer with mapper classes for every entity.** Today
  `Customer = CrmCustomer` and `AppUser` is both wire and domain shape. This is
  acceptable *only* while the store is in-memory. The moment real DTOs exist,
  insert a mapper at the repository boundary — the type alias is the marked spot
  where that goes.

Each of these is a documented, deliberate gap with a named trigger for closing
it. That is different from an oversight.

## Current migration state

Behind repositories (safe to point at a real API):

| Feature | Repository | Implementation |
| --- | --- | --- |
| Customers | `src/features/customers/repositories/` | `MockCustomerRepository` |
| Users / Departments / Roles / Audit | `src/features/users/repositories/` | Mock adapters over `features/users/data/mock-store.ts` |

Still importing demo data directly (migrate using the recipe in
[`api-integration.md`](./api-integration.md)):

- Products and inventory — `src/features/materials/data/catalog.ts`
- Reports — `src/features/reports/data/reports.ts`
- Opportunities — `src/features/opportunities/data/pipeline.ts`
- Field activities and check-in — `src/features/field/data/field.ts`
- Planning — `src/features/planning/data/demo-data.ts` (largest; has its own context store)

This list is the migration backlog. It is ordered roughly by how much each
feature would cost to convert later versus now.

## Frontend authorization is not security

`ROUTE_RULES` (in `src/config/permissions.ts`), `AuthGuard`, and `can()` control what a user *sees*. They are a
UX affordance. Any endpoint the backend exposes must independently validate the
bearer token and the required permission, because a browser client can be
modified by whoever is running it. See
[`authorization.md`](./authorization.md).
