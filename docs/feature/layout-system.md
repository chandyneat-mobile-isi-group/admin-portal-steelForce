# Multi-layout workspace system — architecture analysis & implementation plan

**Status:** Implemented · **Date:** 2026-09-18 · **Decision record:** [ADR 007](../adr/007-multi-layout-workspace-shells.md)

Three user-selectable workspace shells around one unchanged application. This
document holds the analysis the work was planned from; the sections below are
kept as the record of *why* the shape is what it is. What actually shipped, and
the decisions taken along the way, are in ADR 007.

**Resolved at implementation time**, in the absence of an answer:
1. No reference image ever arrived — the shells were built to the written spec.
2. Layout #2 ships as **"Modular ERP"**, described as "Odoo-inspired modular workspace".
3. The Ecosystem grid **does** show Purchases / Finance / HR as visibly disabled
   "Coming soon" tiles. They are inert by construction — no route exists.
4. The preference persists **per browser** (`localStorage`); there is still no
   user-preferences API to hang it on.

---

## A. Current architecture

The portal is a Next.js 14 App Router application, `src/`-based, feature
oriented per [ADR 006](../adr/006-src-feature-oriented-structure.md), with
dependencies flowing `app → features → components → hooks → lib →
infrastructure → domain` and `config/` readable from anywhere.

| Concern | Where it lives | Relevant property |
| --- | --- | --- |
| Routing | `src/app/(portal)/**` — 43 page files | One route group, one shared layout |
| Shell mount | `src/app/(portal)/layout.tsx` | `<AuthGuard><AppShell>{children}</AppShell></AuthGuard>` |
| Client providers | `src/app/providers.tsx` | Query → Theme → I18n → Auth, above the router |
| Navigation model | `src/config/navigation.ts` | Declarative `NAV_SECTIONS`, permission-tagged |
| Route authorization | `src/config/permissions.ts` + `src/lib/auth/authorization.ts` | Longest-prefix match; unmapped route = denied |
| Session & permissions | `src/lib/auth/auth-context.tsx` | `useAuth()` exposes `can/canAny/canAll/hasRole` |
| Server state | `@tanstack/react-query` | Single `QueryClient` in `providers.tsx` |
| Client state | React Context only | No Redux/Zustand/Jotai — deliberately |
| Preferences | `localStorage`, `steelforce-*` keys | `-locale`, `-sidebar-collapsed`, `-sidebar-groups` |
| Theme | `next-themes`, class strategy | Pre-paint inline script avoids flash |
| Design tokens | `src/styles/isi-brand.css` → `globals.css` → `tailwind.config.ts` | See [design-system.md](../design-system.md) |
| Brand assets | `assets/` (masters) → `public/brand/` (generated) | `src/lib/brand/assets.ts` exports paths |

**The decisive fact:** every protected page in the product mounts through
exactly one component — `AppShell`, named in one line of one file. There is no
per-route layout duplication to unpick. A layout system is therefore an
*insertion*, not a refactor.

### What is already reusable

- **`NAV_SECTIONS`** is a pure data tree (`NavSection → NavGroup → NavLeaf`),
  each leaf carrying `href`, `icon`, `labelKey` and a `permission`.
  `navigationFor(permissions)` returns the authorized subtree and drops empty
  groups. All three layouts can render from this one source.
- **`resolveActiveNav(pathname)`** already resolves the active leaf/group/section
  with longest-match semantics — breadcrumbs and active states for free.
- **shadcn/ui is complete**, including `popover`, `dropdown-menu`, `command`,
  `breadcrumb`, `tabs`, `table`, `sheet`. The switcher needs no new dependency.
- **`ProfileMenu`, `LanguageSwitcher`, `ThemeToggle`, `StatCard`, `ChartCard`,
  `StatusPill`, `DrawerPanel`** are already shell-agnostic shared components.

### What is not reusable yet

- **`Header`** hardcodes its own `pageMap` of 16 routes for the page title,
  duplicating what `resolveActiveNav` + `NAV_LEAVES` already know.
- **`AppShell`** owns the `Cmd/Ctrl+B` shortcut and mobile drawer state, which
  belongs to *sidebar-bearing* layouts rather than the shell concept.
- **`/dashboard/page.tsx`** is 416 lines with **six datasets declared inline**
  (`salesRevenueData`, `ordersData`, `quotationConversion`,
  `customerGrowthData`, `provinceData`, `recentOrders`). There is no dashboard
  data module to share across three presentations. This is the single largest
  piece of real work in the plan.

---

## B. Current layout implementation

```
(portal)/layout.tsx
└── AuthGuard                          gate: session + route permission
    └── AppShell                       ← the only shell that exists
        ├── Sidebar                    280px panel / 80px rail / mobile drawer
        │   ├── SidebarBrand           ISI mark + app name + collapse toggle
        │   ├── SidebarNav             renders navigationFor(permissions)
        │   └── SidebarFooter
        ├── Header                     title, breadcrumb, search, notifications,
        │                              language, theme, profile slot
        └── <main>                     motion wrapper, keyed on pathname
```

Two observations that shape the design:

1. **The ISI mark currently lives in the sidebar, not the header.** The request
   places the layout switcher "beside the ISI STEEL logo". In Ecosystem and
   Modular ERP the logo belongs in the top bar. So the logo and the switcher
   must travel together as one component, not be positioned per layout.
2. **`AuthGuard` sits above the shell.** Any shell swap happens strictly inside
   the guard — session, permissions and the `QueryClient` are untouched by a
   layout change, which satisfies §17 by construction rather than by discipline.

---

## C. Recommended architecture

```
app/(portal)/layout.tsx
└── AuthGuard                                     ← unchanged
    └── LayoutProvider                            preference: read, set, persist
        └── LayoutManager                         picks a shell, lazy-loads it
            ├── EcosystemLayout      ┐
            ├── ModularERPLayout     ├─ each composes shared chrome primitives
            └── ERPWorkspaceLayout   ┘
                └── {children}                    ← the same page, untouched
```

### Naming

Internal identifiers avoid the third-party name, as you proposed:

| Layout id | Component | UI label | UI description |
| --- | --- | --- | --- |
| `ecosystem` | `EcosystemLayout` | Ecosystem | Modern application ecosystem |
| `modular` | `ModularERPLayout` | Modular ERP | Odoo-inspired modular workspace |
| `workspace` | `ERPWorkspaceLayout` | ERP Workspace | Enterprise productivity |

Labels live in one registry (`src/config/layouts.ts`) and in `locales/*/common.json`,
so renaming is a data change. **Recommendation:** ship the visible label as
"Modular ERP" rather than "Odoo Layout" — naming another vendor's product in
your own product chrome is a trademark exposure with no user benefit, and the
description already credits the design reference.

### The contract

```ts
// src/domain/enums/layout.ts — framework-free, per ADR 006
export type LayoutId = 'ecosystem' | 'modular' | 'workspace';

// src/lib/layout/layout-context.tsx
interface LayoutContextValue {
  layout: LayoutId;          // current, after hydration
  setLayout: (id: LayoutId) => void;
  isHydrated: boolean;       // false until localStorage has been read
}
```

`LayoutProvider` follows the exact pattern `I18nProvider` already uses:
`useState` default → read storage in `useEffect` → write on change. Storage key
`steelforce-layout`, matching the existing convention.

### Shared chrome primitives — the anti-duplication layer

The three shells must not each grow their own header. Everything a shell needs
is built once in `components/layout/chrome/`:

| Primitive | Used by | Responsibility |
| --- | --- | --- |
| `BrandBar` | all three | ISI mark + wordmark + **LayoutSwitcher**, one unit |
| `GlobalSearch` | all three | the existing search input, extracted from `Header` |
| `HeaderActions` | all three | notifications, language, theme, profile slot |
| `PageTitle` | all three | title + breadcrumb, driven by `resolveActiveNav` |
| `NavTree` | modular, workspace | vertical tree from `navigationFor()` |
| `AppLauncher` | ecosystem, modular | grid/menu of application tiles |
| `ContentArea` | all three | `<main>`, max-width, motion wrapper |

A shell becomes a ~60-line composition of these. `Header` is refactored into
`HeaderActions` + `GlobalSearch` + `PageTitle` and its 16-entry `pageMap` is
deleted in favour of `resolveActiveNav` — a net simplification the layout work
pays for.

### Applications are derived, never hardcoded

Ecosystem's app grid and Modular's app launcher both render **`NAV_SECTIONS`
groups**, not a second list:

```ts
// src/config/applications.ts
// Presentation metadata only — id must match an existing NavGroup/NavLeaf id.
// Route, icon, label and permission continue to come from navigation.ts.
export const APP_META: Record<string, { tint: BrandTint; blurb: string }> = { … };
```

This keeps one source of truth for routes and permissions. A module the session
cannot access never reaches the grid, because `navigationFor()` already removed
it — §17 is satisfied without a second permission check.

> **Scope note:** the request's example app list includes **HR, Finance and
> Purchases**. Those modules do not exist in this portal — there is no route, no
> permission and no page. The grid will render what the product actually has:
> Dashboard, Approval, Depots, Sales, Promotions, Products, Visit Operation,
> Reports, Administration, Settings. If you want disabled "coming soon" tiles
> for the roadmap modules, say so and I will add them as an explicit, clearly
> non-navigable state — but I will not invent routes.

### Dashboard: one dataset, three presentations

```
features/dashboard/
  data/overview.ts        the six datasets, extracted verbatim from the page
  hooks/use-overview.ts   one hook — the single fetch point when the API lands
  components/             KpiRow, RevenueChart, OrdersChart, ConversionDonut,
                          ProvinceTable, RecentOrdersTable, QuickActions,
                          RecentActivity  ← presentational, layout-agnostic
  views/
    EcosystemOverview     app grid + quick actions + activity + light KPIs
    ModularOverview       module KPIs + operational lists
    WorkspaceOverview     today's dense KPI/chart/table grid (current design)
```

`/dashboard/page.tsx` becomes a thin selector that renders the view matching the
active layout. One data module, one hook, one future API call — §15 and §18 are
satisfied structurally, and the existing dense dashboard survives verbatim as
`WorkspaceOverview`.

---

## D. Files that need modification

| File | Change | Risk |
| --- | --- | --- |
| `src/app/(portal)/layout.tsx` | Wrap in `LayoutProvider` + `LayoutManager` | Low — 2 lines |
| `src/app/layout.tsx` | Add pre-paint `data-layout` script (see Risk 1) | Low |
| `src/components/layout/app-shell.tsx` | Becomes `ERPWorkspaceLayout`; sidebar/shortcut state moves to `use-shell-chrome` | Medium — the current shell must keep behaving identically |
| `src/components/layout/header.tsx` | Split into `PageTitle` / `GlobalSearch` / `HeaderActions`; drop `pageMap` | Medium — 16 title mappings change source |
| `src/components/navigation/sidebar/index.tsx` | `SidebarBrand` delegates to `BrandBar` | Low |
| `src/app/(portal)/dashboard/page.tsx` | Data extracted; page becomes a view selector | **High — the largest single change** |
| `src/config/navigation.ts` | Optional `app?: AppMeta` on `NavGroup` (additive) | Low |
| `src/app/(portal)/settings/page.tsx` | Add layout control to the Appearance section | Low |
| `src/locales/{en,km}/common.json` | Switcher + layout label strings | Low |
| `docs/design-system.md` | Link the layout system | None |

**Not modified:** every other page, every feature, every repository, the API
client, auth, guards, `permissions.ts`, `authorization.ts`, the query client.

## E. Files to create

```
src/domain/enums/layout.ts                       LayoutId
src/config/layouts.ts                            registry: id, label, description, icon
src/config/applications.ts                       app tile presentation metadata
src/lib/layout/layout-context.tsx                LayoutProvider + useLayout()
src/hooks/use-shell-chrome.ts                    mobile drawer + Cmd/Ctrl+B, shared

src/components/layout/layout-manager.tsx         shell selection + lazy loading
src/components/layout/layout-switcher.tsx        the popover
src/components/layout/chrome/
  brand-bar.tsx  global-search.tsx  header-actions.tsx
  page-title.tsx  nav-tree.tsx  app-launcher.tsx  content-area.tsx
src/components/layout/shells/
  ecosystem/{index,ecosystem-header,ecosystem-app-grid}.tsx
  modular/{index,modular-header,modular-nav,modular-workspace}.tsx
  workspace/{index,workspace-header,workspace-sidebar}.tsx

src/features/dashboard/                          data, hook, widgets, three views

docs/adr/007-multi-layout-workspace-shells.md    the decision record
```

Placement follows [folder-structure](../skills/folder-structure.md): shells are
shared chrome (`components/`, no `@/features/` imports), the dashboard is a
feature, the preference context is `lib/`, registries are `config/`, the enum is
`domain/`.

---

## F. Risks

**1. Layout flash on first paint.** Reading `localStorage` in an effect means
the first client render uses the default shell and then swaps — visibly. `next-themes`
already solves this for theme with a blocking inline script. Mitigation: the
same technique — a small script in `app/layout.tsx` setting
`document.documentElement.dataset.layout` before paint, which `LayoutProvider`
reads synchronously on first render. *Severity: high if unmitigated, low with
the script.*

**2. Page state is lost when the shell swaps.** Swapping the component that
wraps `children` changes the tree shape, so React unmounts and remounts the
page — an in-progress form would be cleared. Three options, in order of cost:

| Option | State preserved | Cost |
| --- | --- | --- |
| Accept remount (**recommended default**) | No | None |
| Guard the switch when a form is dirty | N/A — blocks the switch | Small |
| Host `children` in a stable node and `createPortal` into the active shell | Yes | Moderate, and constrains shell DOM |

Recommendation: ship the default, and add the portal host only if users
actually switch layouts mid-form. §13's "if technically possible" is doing real
work here — I would rather state the trade-off than quietly claim preservation.
Query cache, session and scroll restoration are unaffected either way.

**3. Dashboard extraction is the real blast radius.** 416 lines, six datasets,
recharts wiring. Mitigation: extract the data module first and leave the page
rendering identically (a pure move, verifiable by diffing the rendered output),
then add the other two views. Phase 4 is separable and can ship after Phases 1–3.

**4. Three shells is three times the responsive surface.** Mitigation: the
chrome primitives carry the breakpoint behaviour; shells compose, they do not
re-implement. `NavTree` handles collapse once for both layouts that use it.

**5. Bundle growth.** Mitigation: `next/dynamic` for the two inactive shells.
They sit behind `AuthGuard`, which already renders a splash, so a suspense
boundary costs nothing visible.

**6. `Header`'s `pageMap` removal changes 16 page titles' source.** Mitigation:
a one-time table comparing the current `pageMap` output against
`resolveActiveNav` output for every route before deleting it.

**7. No server-side preference store.** The settings page is local state today;
there is no user-preferences API. The layout persists per browser, not per user
account. Flagging rather than inventing a backend contract — if you want it
per-account, that needs a backend field and a decision about precedence.

---

## G. Migration strategy

Seven phases, each independently shippable and independently revertible. The
product is fully working at the end of every one.

**Phase 1 — Foundation, no visible change.**
`LayoutId`, `layouts.ts` registry, `LayoutProvider`, pre-paint script,
`LayoutManager` that currently only ever returns the existing shell renamed to
`ERPWorkspaceLayout`. Acceptance: the portal is pixel-identical; the preference
round-trips through a refresh.

**Phase 2 — Extract shared chrome.**
`Header` → `PageTitle` + `GlobalSearch` + `HeaderActions`; `BrandBar`;
`use-shell-chrome`; `NavTree` from `SidebarNav`. Acceptance: still
pixel-identical. This is the phase that prevents duplication later, so it
happens *before* any new shell exists.

**Phase 3 — The switcher.**
`LayoutSwitcher` in `BrandBar`, with all three options listed and two of them
disabled. Full keyboard support, ARIA, Escape, click-outside, active checkmark.
Acceptance: §12 and §14 criteria met against the one live layout.

**Phase 4 — Dashboard data extraction.**
Move the six datasets to `features/dashboard/data/`, introduce `useOverview()`,
split the page into presentational widgets, keep the current composition as
`WorkspaceOverview`. Acceptance: `/dashboard` renders identically.

**Phase 5 — Ecosystem layout.**
Top bar + app grid + `EcosystemOverview` (quick actions, recent activity,
business overview). Enable its switcher entry. Acceptance: every route renders
inside it; permissions still filter the grid.

**Phase 6 — Modular ERP layout.**
Top bar + app launcher + module-scoped navigation + breadcrumbs + action bars,
`ModularOverview`. Enable its entry.

**Phase 7 — Polish.**
Responsive passes per layout, `next/dynamic` code-splitting, settings
integration, ADR 007, i18n strings for `km`, accessibility audit against §14,
and a route-by-route regression sweep across all three shells.

### Verification at every phase

- `npm run typecheck` clean of new errors.
- Every route in `(portal)` renders in the active shell.
- A low-permission session sees the same filtered navigation in all three shells.
- No new network request appears when switching layout (React Query devtools).
- Keyboard-only traversal of the switcher.

---

## Open questions

1. **The reference image did not arrive.** Section 6's visual assumptions stand
   in for it. Re-send it and I will reconcile before Phase 5.
2. **Visible label for layout #2** — "Modular ERP" (recommended) or "Odoo Layout"?
3. **Roadmap tiles** — should the Ecosystem grid show disabled HR / Finance /
   Purchases tiles, or only the modules that exist?
4. **Per-account persistence** — browser-local is what exists today. Enough?
