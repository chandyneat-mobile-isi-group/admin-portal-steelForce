---
name: typescript-engineering
description: Strict, production-grade TypeScript for web apps — tsconfig strictness, type modeling, discriminated unions, generics, runtime validation with zod, branded types, exhaustive checks, and typing React/Next.js code. Use this skill whenever writing or reviewing TypeScript, fixing type errors, designing types for API responses or domain models, removing `any`, or setting up a TS project, even if the user only says "fix this type error".
---

# TypeScript Engineering

Types should make illegal states unrepresentable and catch bugs at compile time — then runtime validation guards every boundary the compiler can't see.

## tsconfig baseline
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Rules
1. **No `any`.** Use `unknown` and narrow. Lint with `@typescript-eslint/no-explicit-any`.
2. **Validate at boundaries** (HTTP, forms, env, localStorage, webhooks). Derive types from schemas: one source of truth.
3. **Prefer `type` unions over enums.** `type Role = "admin" | "member"`; or `as const` objects.
4. **Avoid `as` assertions** except after validation. Never `as unknown as X`.
5. **Use `satisfies`** to check shape while keeping literal inference.
6. **Explicit return types** on exported functions and public module APIs.

## Schema-first types
```ts
import { z } from "zod";
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

const data: unknown = await res.json();
const user = UserSchema.parse(data); // typed & verified
```

## Discriminated unions for state
```ts
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }

function render(s: AsyncState<User>) {
  switch (s.status) {
    case "idle": return null;
    case "loading": return "Loading…";
    case "success": return s.data.email;
    case "error": return s.error.message;
    default: return assertNever(s);
  }
}
```

## Result type instead of throwing for expected failures
```ts
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

## Branded types for IDs
```ts
type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type OrgId = Brand<string, "OrgId">;
// getOrg(userId) is now a compile error
```

## Useful patterns
```ts
// Config maps checked but narrow
const routes = { home: "/", users: "/users" } as const satisfies Record<string, `/${string}`>;
type RouteKey = keyof typeof routes;

// Generic constrained helper
function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map(k => [k, obj[k]])) as Pick<T, K>;
}

// Type guard
function isDefined<T>(v: T | null | undefined): v is T { return v != null; }
```

## React typing
```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button"> & { variant?: "primary" | "ghost" };
export function Button({ variant = "primary", ...rest }: ButtonProps) { return <button {...rest} />; }

// Polymorphic-lite: prefer asChild (Radix Slot) over complex generic "as" props.
// Next.js 15 page props: params/searchParams are Promises
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

## Fixing type errors — workflow
1. Read the *last* line of the error first (the root mismatch).
2. Hover the inferred type; check if a value is widened (`string` vs literal) → add `as const`.
3. If a library type is wrong, augment via `declare module` rather than casting at every call site.
4. If you need `as`, validate first or write a type guard.

## Anti-patterns
- `// @ts-ignore` (use `@ts-expect-error` with a reason, if ever)
- Optional everything (`field?: T`) to silence errors
- Duplicating API types by hand alongside schemas
- `Function`, `Object`, `{}` as types

## Checklist
- [ ] `strict` + `noUncheckedIndexedAccess` on; `tsc --noEmit` in CI
- [ ] Zero `any` / unjustified `as`
- [ ] All external input parsed with zod
- [ ] Unions handled exhaustively
