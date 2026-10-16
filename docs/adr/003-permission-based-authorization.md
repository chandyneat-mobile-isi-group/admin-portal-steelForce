# 003 — Permission-based authorization with default deny

**Status:** Accepted · **Date:** 2026-08-11

## Context

Access control can key off roles (`role === 'admin'`) or off permissions
(`can('customers.create')`).

Role checks scatter policy across the codebase. Adding a "Regional Manager" role
then means auditing every `role ===` comparison and guessing which ones should
include it. The checks are also ambiguous at the point of reading: `role ===
'admin'` does not say what capability is actually being gated.

## Decision

Permissions make decisions; roles are for display and coarse grouping.

- `can()`, `canAny()`, `canAll()` from `useAuth()` gate UI
- `ROUTE_RULES` maps route → required permission, matching the longest prefix
- Permissions drive navigation, routes, sections, and actions from one source
- **Unmapped protected routes are denied by default**

The default matters most. A new route added without a `ROUTE_RULES` entry is
inaccessible rather than public: forgetting produces a visibly broken page
during development instead of a quiet exposure in production. Failures should be
noisy on the safe side.

## Consequences

A new role is a change to its permission set, not a code sweep. Permission
checks state the capability being gated. Frontend and backend can share
permission vocabulary.

New routes require a `ROUTE_RULES` entry, which is friction — intentional, and
documented in the contributing checklist.

## Security note

This is a UX control, not a security boundary. It runs in a browser the user
controls. Every endpoint must independently validate the token and the required
permission, including object-level access — that *this* user may act on *this*
record, not merely that they hold the permission in general. If client and
server disagree, the server is right.

## Alternatives rejected

**Role-based checks** — the scattering problem above.

**Allow-by-default for unmapped routes** — a forgotten entry becomes a silent
exposure, and silent is the worst property a security failure can have.
