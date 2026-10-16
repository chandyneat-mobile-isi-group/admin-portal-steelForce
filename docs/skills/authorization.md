# Authorization

## Permissions decide; roles describe

Access decisions use permissions (`customers.view`, `users.create`). Roles exist
for display and coarse UX grouping only.

```ts
const { can, canAny, canAll } = useAuth();
if (can('customers.create')) { /* show the button */ }
```

Do not write `role === 'admin'`. Role checks scatter policy across the codebase,
and every new role becomes an edit in N unrelated files. A permission check
reads the same everywhere and only the role→permission mapping changes.

The permission vocabulary lives in `src/domain/enums/auth.ts` and the pure
checks in `src/domain/permissions/`. The route table is
`src/config/permissions.ts`; the matching logic that reads it is
`src/lib/auth/authorization.ts`.

## Route policy

`ROUTE_RULES` maps route → required permission and is the authoritative client
map. It matches the **longest** prefix, so `/user-management/users` can require
something different from `/user-management`.

Unmapped protected routes are **denied by default**. Adding a route without a
rule makes it inaccessible rather than public — a new page cannot leak by
omission. Add the `ROUTE_RULES` entry in the same change as the route.

`AuthGuard` in `src/app/(portal)/layout.tsx` is the single protected boundary. It
evaluates before the page renders, so an unauthorized screen never paints.

## Permissions should drive the UI

Navigation visibility (`src/config/navigation.ts`), route access, page sections, and
action buttons should all derive from the same permission set. A user who cannot
act on something should generally not see the control — but see the warning
below about what that does and does not accomplish.

## This is not a security boundary

Everything above runs in the browser and can be bypassed by whoever controls it.
Hidden buttons, guarded routes, and `can()` checks are **user-experience
controls**: they keep the interface honest and prevent confusing dead ends.

The backend must independently enforce, on every request:

- token signature, issuer, audience, expiry, and revocation
- the permission required for that operation
- object-level access — that *this* user may act on *this* record, not merely
  that they hold `customers.update` in general

If the client and the server disagree about what a user may do, the server is
right. See [`Secuirty.md`](../Secuirty.md).
