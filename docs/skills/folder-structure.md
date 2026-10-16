# Folder structure

Everything lives under `src/`. Path alias `@/*` → `./src/*`.

```
src/
├── app/                      Routes only — composition, no business logic
│   ├── (auth)/               login, 401, 403  (route group; URLs unchanged)
│   ├── (portal)/             Protected group; layout.tsx = AuthGuard + AppShell
│   ├── layout.tsx            Server Component; owns metadata
│   └── providers.tsx         Client provider chain (theme → i18n → auth)
│
├── components/               Shared presentation. Never imports from features/
│   ├── ui/                   Radix/shadcn primitives
│   ├── layout/               app-shell, header, page-header, page-layout, section-header
│   ├── navigation/           sidebar/
│   ├── forms/                form, filter-chip, search-bar
│   ├── tables/               data-table
│   ├── feedback/             feedback, skeletons
│   └── shared/               cross-feature patterns with no domain knowledge
│
├── features/                 Feature-owned code, each with an index.ts public API
│   ├── auth/                 guards, login form, profile menu, splash, error page
│   ├── customers/            components, data, repositories
│   ├── products/             components, data
│   ├── planning/             components, data, lib, store, types
│   ├── users/                components, data (mock-store), repositories
│   ├── field/                data
│   ├── opportunities/        data
│   └── reports/              data
│
├── domain/                   Framework-free. No React, Next, fetch, or UI imports
│   ├── entities/             user.ts, auth.ts
│   ├── enums/                permissions.ts, auth.ts
│   ├── errors/               api-error.ts, auth-error.ts
│   └── permissions/          pure hasPermission / hasAny / hasAll
│
├── infrastructure/           Talks to the outside world
│   ├── api/                  ApiClient — the transport for all feature repositories
│   ├── repositories/         Base contracts: ListQuery, PageResult, CrudRepository
│   ├── auth/                 OAuth2 repository, JWT decode
│   └── storage/              session-store, device-id (browser storage)
│
├── lib/                      Cross-cutting app-layer helpers
│   ├── auth/                 auth-context, authorization logic, types barrel
│   ├── i18n/                 I18nProvider, useI18n
│   ├── permissions/          role display metadata, demo grants
│   ├── validation/           shared field rules
│   ├── formatting/           formatCurrency, formatDate, relativeDays
│   └── utilities/            cn, layout scale, motion tokens, random, demo-clock
│
├── config/                   Values that change without a code change
│   ├── environment.ts        The ONLY place process.env is read
│   ├── navigation.ts         Sidebar structure
│   ├── permissions.ts        ROUTE_RULES route→permission table
│   └── features.ts           Feature flags
│
├── hooks/                    Cross-feature React hooks
└── locales/                  en/, km/ — both first-class
```

## Import direction

```
app → features → components → hooks → lib → infrastructure → domain
                                              ↘ config ↙
```

Enforced today and verifiable by grep:

- `src/components/**` contains **no** `@/features/` import. Shared chrome that
  needs feature content takes it as a slot — see `HeaderProps.profileMenu`.
- `src/domain/**` imports no React, Next, `@/infrastructure`, or `@/components`.
- `process.env` appears only in `src/config/environment.ts`.
- `fetch()` appears only under `src/infrastructure/` — in `api/client.ts`, and
  in `auth/repository.ts`, which cannot use `ApiClient`: the OAuth2 token
  endpoint is form-encoded and must not carry a bearer header.

## Feature public APIs

Every feature has an `index.ts`. Other features and routes import from
`@/features/customers`, never `@/features/customers/repositories/mock-customer-repository`.
The barrel is the contract; everything behind it is free to move.

The one deliberate exception: cross-feature imports **between data modules**
(`features/reports/data/reports.ts` importing `@/features/customers/data/crm`)
stay deep. Routing them through a barrel would pull that feature's client
components into a pure data module. Those imports are a real smell — reports
depending on three other features' demo data — and they disappear when each
feature moves behind its repository.

## The deciding question: who owns this?

**Used by one feature?** It goes in that feature's folder. The test is not
"could this be reused" — almost anything could — but "is it reused *today*".

**Reused across features with no business meaning?** `components/ui/` for
primitives, `components/shared/` for patterns.

**A rule the backend also enforces, expressible without React?** `domain/`.

**Talks to network or browser storage?** `infrastructure/`.

**A value someone might change without shipping code?** `config/`.

## Note on `hooks/`

`src/hooks/` is not in the original target sketch, but it is kept: it holds
genuinely cross-feature hooks (`use-repository-query`, `use-sidebar`,
`use-toast`), `components.json` already aliases it, and the alternatives put
React hooks inside `lib/utilities/` where nobody would look for them.

## graphify-out/

Generated knowledge graph: `graph.html` (interactive), `GRAPH_REPORT.md`,
`graph.json`. Rebuild with `/graphify . --update` after structural change. It is
a navigation aid, not a build input.
