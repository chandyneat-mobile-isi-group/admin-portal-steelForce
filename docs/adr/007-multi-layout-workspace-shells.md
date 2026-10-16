# 007 — Multiple workspace shells around one application

**Status:** Accepted · **Date:** 2026-09-18

## Context

The portal had one shell: a fixed left sidebar, a title header, a wide content
column. It suits an operator who lives in the system all day and navigates by
muscle memory. It suits two other users less well — someone who moves across
modules and mostly wants to *find* an application, and someone who works inside
one module at a time and wants the navigation to stay as short as that module.

The obvious way to serve all three is to build three portals. That is also the
way to end up with three divergent copies of the same business logic, three
dashboards drifting apart, and a permission check that is right in two of them.

Two properties of the existing code made a cheaper answer possible:

- Every protected page mounts through **one** component, named in one line of
  `app/(portal)/layout.tsx`. There was no per-route layout duplication to unpick.
- Navigation is already **declarative and permission-tagged**. `NAV_SECTIONS`
  plus `navigationFor(permissions)` is a data structure any presentation can
  render, and `resolveActiveNav` already answers "where am I".

## Decision

Introduce a layout system in which **a layout is a presentation shell and
nothing else**.

```
AuthGuard → LayoutProvider → LayoutManager → <shell> → {children}
```

Three shells — `EcosystemLayout`, `ModularERPLayout`, `ERPWorkspaceLayout` —
selected by a `LayoutId` preference. Four rules hold the boundary:

1. **A shell renders; it does not decide.** No data fetching, no permission
   check, no routing. It receives `children` and the session-menu slot.
2. **`LayoutManager` sits inside `AuthGuard`.** The session and the route
   permission are resolved before any shell exists, so a layout change cannot
   widen access. This is structural, not a convention to remember.
3. **Navigation is derived, never redeclared.** Shells and the app grid read
   `navigationFor()` / `applicationsFor()`. There is no second list of modules
   and no second permission check.
4. **One dataset, three presentations.** The dashboard's six datasets moved to
   `features/dashboard/data/`, behind a single `useOverview()`. Each shell has a
   view; none has its own data.

Shared chrome — `BrandBar`, `GlobalSearch`, `HeaderActions`, `PageTitle`,
`NavTree`, `AppLauncher`, `ContentArea` — is built once and composed. A shell is
a short file. This was built *before* the second shell existed, which is what
stopped the duplication rather than merely discouraging it.

### Naming

Internal identifiers are `ecosystem` / `modular` / `workspace`; the components
are `EcosystemLayout` / `ModularERPLayout` / `ERPWorkspaceLayout`. The second
shell is presented to users as **"Modular ERP"**, described as "Odoo-inspired
modular workspace". Naming another vendor's product in our own chrome is
trademark exposure with no user benefit; crediting the design reference in the
description costs nothing.

### Persistence

`localStorage`, key `steelforce-layout`, matching `steelforce-locale` and the
sidebar keys. A pre-paint inline script in `app/layout.tsx` resolves it onto
`<html data-layout>` before React runs — the same technique `next-themes` uses
for the theme — so the portal never paints one shell and swaps to another.
The preference is also editable in Settings → Appearance; both write the same
value.

## Consequences

**Good.** Adding a shell is a new file plus a registry entry. Adding a *module*
still means one object in `navigation.ts`, and it appears in all three shells,
correctly permissioned, automatically. The refactor deleted the header's
hand-kept 16-route title map in favour of `breadcrumbFor()`, so titles can no
longer disagree with the menu.

**Accepted cost.** Swapping shells changes the tree above `children`, so React
remounts the page: query cache, session and scroll survive, uncommitted form
state does not. A `createPortal` content host would preserve it at the cost of
constraining every shell's DOM. Not worth it until someone actually switches
layouts mid-form.

**Watch.** Three shells is three responsive surfaces. The rule that keeps it
manageable is that breakpoint behaviour lives in the chrome primitives; a shell
composes them and does not re-implement them. A shell that starts growing its
own header is the signal that something belongs in `chrome/`.

## Alternatives rejected

- **Three route groups** (`(ecosystem)/`, `(modular)/`, `(workspace)/`) — would
  triple every route and break the "URL is stable across layouts" requirement.
- **CSS-only reskin** — would preserve page state across a switch, but cannot
  express structurally different navigation, which is the point.
- **A layout flag inside each page** — puts presentation choice in 43 files and
  guarantees drift.
