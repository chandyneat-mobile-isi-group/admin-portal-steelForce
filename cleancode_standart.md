# SteelForce Admin Portal — Clean Code Standard

## Goal

Write code that makes portal behavior, ownership, and security rules easy to understand and safe to change. Optimize for clarity, typed boundaries, small focused modules, and consistent user experience over cleverness.

## TypeScript rules

- Keep TypeScript strict. Do not introduce `any`; use `unknown` for untrusted values and narrow it safely.
- Define shared domain contracts in `lib/types.ts` or the owning feature module. Keep component-only props close to the component.
- Prefer `type` for unions and object shapes; use `interface` for extendable public contracts where that improves readability.
- Make nullability explicit (`User | null`) and handle loading, empty, error, and success states deliberately.
- Avoid type assertions. If one is necessary at an external boundary, keep it local and validate first.
- Prefer discriminated unions for state machines and mutually exclusive states, as used by authentication events.

## React and Next.js rules

- Use Server Components by default. Add `'use client'` only for hooks, browser APIs, event handlers, or client-side providers.
- Keep route files focused on page composition. Move repeated or complex UI into a component.
- One component should have one clear responsibility. Split a component when data loading, state control, and several visual sections obscure that responsibility.
- Prefer explicit props and callbacks over reaching into unrelated module state.
- Use `useMemo`, `useCallback`, and effects only where their lifecycle or performance benefit is demonstrated. Correct dependencies are mandatory.
- Always clean up timers, subscriptions, and async effects where cancellation is required.
- Use stable keys based on record identity, never array indexes for mutable lists.
- Use the existing UI primitives in `components/ui` and shared patterns in `components/shared` before adding a parallel implementation.

## Module boundaries and imports

- Organize code by feature: routes in `app`, presentation in `components/<feature>`, and domain/data behavior in `lib/<feature>`.
- Use `@/` aliases for cross-folder imports. Prefer relative imports only within a small local module family.
- Do not import one feature’s private components or mock data into another feature. Extract a shared module when behavior is genuinely shared.
- Keep import groups ordered: React/Next, external packages, `@/` application modules, then relative modules. Keep type-only imports marked with `type`.
- Do not create circular dependencies. If two modules depend on each other, extract their common contract or helper.

## Naming and file conventions

| Item | Standard | Example |
| --- | --- | --- |
| Component file | kebab-case | `customer-drawer.tsx` |
| Component | PascalCase | `CustomerDrawer` |
| Hook | `use` + camelCase | `useSidebar` |
| Function/variable | camelCase, verb-led for actions | `authorizeRoute`, `saveCustomer` |
| Type/interface | PascalCase | `RouteRule` |
| Constant | camelCase by default; SCREAMING_SNAKE_CASE for true module constants | `REFRESH_SKEW_MS` |
| Route directory | kebab-case | `user-management` |
| Permission | resource.action | `customers.manage` |

Names should state intent. Prefer `permissions`, `session`, and `landingRouteFor` over vague terms such as `data`, `item`, `value`, or `handle` when a precise name is available.

## Data, business logic, and forms

- Do not embed business rules in JSX. Place them in typed helpers, hooks, or feature services and test them separately where practical.
- UI components must not depend directly on mock data if the feature is expected to move to an API. Depend on a typed repository/service contract.
- Feature repositories must use `lib/api/client.ts`; components and feature hooks must never call `fetch` directly.
- Keep backend DTOs, frontend models, and UI view models separate. Map an API DTO at the repository boundary rather than spreading its field names through a page.
- Validate user input with Zod or an equivalent schema at the form boundary, and repeat validation on the server when one exists.
- Keep query/filter state serializable and, when useful to users, synchronized with the URL.
- Handle request states explicitly: loading, success, empty, validation failure, network failure, and forbidden access.
- Do not silently swallow errors. Present a safe, actionable message to the user and retain diagnostic context in approved telemetry/logging.

## Authorization, localization, and accessibility

- Use `useAuth().can`, `canAny`, and `canAll` for UI permission checks. Do not compare a role string to determine access.
- Add a route policy in `lib/auth/authorization.ts` for every new protected route; an unmapped route is intentionally denied.
- Add user-facing strings to both `locales/en/common.json` and `locales/km/common.json`. Avoid hard-coded copy in components.
- Use semantic HTML first. Inputs need labels; icon-only controls need accessible names; dialogs need an understandable title and focus behavior.
- Ensure keyboard operation, visible focus, sufficient contrast, and non-color-only status indicators.

## Styling standard

- Use Tailwind utility classes and existing design tokens. Do not introduce one-off inline styles for values that belong in the theme.
- Preserve the shared `card` radius token and existing color system rather than creating near-duplicate visual variants.
- Build responsive layouts intentionally; test narrow viewport, normal desktop, and dark theme states.
- Prefer reusable variants/components over copied blocks of long class strings when the same pattern occurs more than twice.

## Comments and documentation

- Comment the reason for a non-obvious decision, constraint, or security behavior; do not narrate obvious code.
- Keep comments correct when code changes. Delete misleading comments rather than preserving history in source files.
- Use JSDoc for exported contracts or behavior that has a meaningful non-obvious rule.
- Update `Achitutere.md` and `Secuirty.md` when a change affects system boundaries or security posture.

## Before opening a pull request

- [ ] The change has one clear purpose and no unrelated formatting churn.
- [ ] Names, types, and module placement follow this standard.
- [ ] User-visible copy is localized and interaction is accessible.
- [ ] Permission and route policy changes are complete.
- [ ] Loading, empty, error, and mobile states were considered.
- [ ] No secrets, sensitive data, or debug logging were added.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes for release-ready changes.
