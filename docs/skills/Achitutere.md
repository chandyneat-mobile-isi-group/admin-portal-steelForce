# SteelForce Admin Portal — Architecture Blueprint

This file is the high-level map. Detailed guidance lives in [`docs/`](./docs):
[architecture](./docs/architecture.md) (layering contract and migration
backlog), [folder-structure](./docs/folder-structure.md),
[api-integration](./docs/api-integration.md) (recipe for putting a feature
behind a repository), [authentication](./docs/authentication.md),
[authorization](./docs/authorization.md),
[state-management](./docs/state-management.md), [testing](./docs/testing.md),
[contributing](./docs/contributing.md), and decision records in
[`docs/adr/`](./docs/adr).

## Purpose

SteelForce is a web-based administration portal for sales, customers, products, field operations, planning, reports, and user administration. It supports English and Khmer, light/dark themes, role and permission aware navigation, and an offline demonstration mode.

## Technology baseline

| Area | Choice |
| --- | --- |
| Framework | Next.js 13.5, App Router, React 18, TypeScript (strict mode) |
| Styling | Tailwind CSS, shadcn-style UI primitives, Radix UI |
| Forms and validation | React Hook Form, Zod |
| Charts and maps | Recharts, React Three Fiber, optional Google Maps integration |
| Client state | React Context, reducers, focused local hooks |
| Internationalization | `lib/i18n.tsx`, `locales/en/common.json`, `locales/km/common.json` |
| Deployment | Vercel or Netlify configuration included |

## Application map

```text
app/
├── layout.tsx                    Root providers: theme, i18n, auth, toast
├── login/, 401/, 403/            Public authentication and error routes
└── (portal)/                     Protected portal route group
    ├── layout.tsx                AuthGuard + AppShell
    ├── dashboard/
    ├── customers/, products/     Core CRM and catalogue areas
    ├── opportunities/, orders/, quotations/
    ├── planning/, field/, visits/, sales-reps/
    ├── reports/
    ├── user-management/
    ├── profile/, notifications/, settings/
    └── ...

components/
├── ui/                           Reusable primitive UI components
├── shared/                       Cross-feature patterns: tables, drawers, headers
├── auth/                         Forms, guards, profile controls
├── layout/                       App shell, header, sidebar
└── <feature>/                    Feature-owned presentation components

lib/
├── auth/                         Session, OAuth repository, permissions, route policy
├── data/                         Static feature data for the demo
├── planning/                     Planning domain types, store, maps, visual tokens
├── navigation.ts                 Single source for navigation structure
├── types.ts                      Shared domain types
├── mock-data.ts, mock-store.ts   Demo seed data and browser-session mutations
└── i18n.tsx, utils.ts            Cross-cutting helpers
```

## Runtime composition

```text
Browser request
  → RootLayout
      → ThemeProvider
      → I18nProvider
      → AuthProvider
          → public page
          or
          → AuthGuard → AppShell → portal page → feature components
```

`app/(portal)/layout.tsx` is the single protected boundary for portal pages. `AuthGuard` evaluates the requested path using `authorizeRoute` from `lib/auth/authorization.ts`; it prevents an unauthorised screen from rendering.

## Authentication and authorization design

- `AuthProvider` owns the session state machine: restore, authenticate, refresh, expire, and logout.
- `AuthRepository` separates UI code from the implementation. `ApiAuthRepository` uses an OAuth2/OpenIddict token endpoint; `StaticAuthRepository` supports offline demos.
- `session-store.ts` persists an eligible session in browser storage. Access tokens carry the user identity, permission set, session ID, issue time, and expiry.
- `ROUTE_RULES` is the authoritative client route-to-permission mapping. It chooses the longest matching route and denies unmapped protected routes by default.
- UI permission checks must use `useAuth().can`, `canAny`, or `canAll`. Roles are for display and coarse UX only; permissions make access decisions.

Important: client guards are a user-experience control. When a real backend is introduced, every API must independently validate the bearer token and required permission.

## Data and integration model

The current portal has no database or application backend. Seed records live in `lib/mock-data.ts`; `lib/mock-store.ts` supplies in-memory mutations that reset after a browser reload. Feature-specific mock records live under `lib/data/` and `lib/planning/demo-data.ts`.

The frontend is now prepared for a contract-driven API migration:

- `lib/api/config.ts` reads the optional API base URL and timeout from public environment configuration.
- `lib/api/client.ts` is the single authenticated HTTP boundary for future feature repositories. It supplies JSON handling, cancellation, timeouts, correlation IDs, and normalized failures.
- `lib/api/errors.ts` translates transport outcomes to safe, translation-ready frontend error keys without exposing raw backend messages.
- `lib/repositories/` holds contract-neutral pagination and repository interfaces. The customer module demonstrates a development-only mock adapter behind that interface.
- `hooks/use-repository-query.ts` provides cancellation-aware loading, error, refresh, and retry state without adding a global server-state store.

No feature endpoint path or backend DTO has been assumed. When an OpenAPI/Swagger contract is available, add DTO validation/mappers and an API repository per feature, then change its repository binding without rewriting the page UI.

The target production boundary is:

```text
Feature component
  → typed feature service/repository
  → HTTP client with bearer token and error normalization
  → API endpoint
  → API authorization, validation, business service, database
```

Keep components independent of transport details. Introduce typed repositories per feature (`customers`, `orders`, `planning`, and so on), then switch each from mock to API implementation without rewriting its UI.

## Recommended ownership rules

| Concern | Primary location |
| --- | --- |
| URL routes and page composition | `app/` |
| Shared shell and reusable visual primitives | `components/layout`, `components/shared`, `components/ui` |
| Feature-only presentation | `components/<feature>` |
| Domain types, data access, business helpers | `lib/<feature>` or `lib/data` |
| Authentication and access policy | `lib/auth` |
| Navigation hierarchy | `lib/navigation.ts` |
| Translated copy | `locales/<locale>/common.json` |

## Adding a feature

1. Define the domain types and a repository/service contract in `lib/<feature>`.
2. Add the route under `app/(portal)/<feature>/page.tsx`.
3. Add a specific `ROUTE_RULES` entry and the corresponding permission type before exposing the route.
4. Add navigation in `lib/navigation.ts`; derive visibility from permissions rather than duplicating role checks.
5. Build feature components in `components/<feature>` and use shared primitives when the pattern already exists.
6. Add English and Khmer translation keys; do not hard-code new user-facing text.
7. Cover loading, empty, error, and forbidden states.
8. Run `npm run typecheck`, `npm run lint`, and `npm run build` before merging.

## Architectural decisions to preserve

- Prefer Server Components by default. Add `'use client'` only where browser APIs, hooks, or interactive state are required.
- Keep route-level composition thin; move reusable behavior into components and `lib` modules.
- Centralize cross-cutting policy such as permissions, navigation, theme, and translations.
- Prefer module aliases (`@/…`) for imports across module boundaries.
- Treat `components/ui` as shared primitives, not a place for feature business logic.
- Do not import mock data directly into production-ready components; use a feature repository contract instead.

## Delivery checks

```bash
npm run typecheck
npm run lint
npm run build
```

For a production build while the development server is running, use `NEXT_DIST_DIR=.next-prod npm run build`.
