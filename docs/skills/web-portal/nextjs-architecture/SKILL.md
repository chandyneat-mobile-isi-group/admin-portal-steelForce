---
name: nextjs-architecture
description: Architecture guidance for Next.js App Router web portals — folder structure, route groups, layouts, Server vs Client Components, Server Actions, route handlers, data-fetching boundaries, and feature-based module organization. Use this skill whenever the user is starting a Next.js project, adding routes/pages/layouts, deciding where code should live, choosing between server and client components, designing a portal/dashboard/admin area, or refactoring a messy Next.js codebase — even if they don't say "architecture".
---

# Next.js Architecture (App Router)

Build portals that are easy to navigate, server-first, and split by feature — not by file type.

## Core principles
1. **Server-first.** Every component is a Server Component unless it needs state, effects, browser APIs, or event handlers. Push `"use client"` to the leaves.
2. **Colocate by feature.** Code that changes together lives together.
3. **Thin routes.** `page.tsx` composes; it doesn't contain business logic.
4. **One direction of dependencies:** `app/` → `features/` → `lib/` / `components/ui`. Never import `app/` from anywhere else.
5. **Server-only code is marked.** `import "server-only"` in anything touching secrets, DB, or internal APIs.

## Recommended structure
```
src/
├── app/
│   ├── (marketing)/            # public pages, own layout
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (portal)/               # authenticated shell
│   │   ├── layout.tsx          # sidebar + session guard
│   │   ├── dashboard/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   ├── api/webhooks/stripe/route.ts
│   ├── layout.tsx              # <html>, fonts, providers
│   ├── not-found.tsx
│   └── global-error.tsx
├── features/
│   └── users/
│       ├── components/         # UserTable.tsx, UserForm.tsx
│       ├── actions.ts          # "use server" mutations
│       ├── queries.ts          # server-only reads
│       ├── schema.ts           # zod schemas + types
│       └── index.ts            # public surface of the feature
├── components/ui/              # design-system primitives
├── lib/                        # db, auth, env, logger, fetcher
├── hooks/                      # shared client hooks
└── middleware.ts
```

Rules: features may import `lib` and `components/ui`; features import other features only through their `index.ts`.

## Server vs Client decision
| Needs | Component type |
|---|---|
| Data fetch, secrets, DB | Server |
| `useState`, `useEffect`, handlers | Client |
| Browser APIs (window, localStorage) | Client |
| Static markup, heavy libs (markdown, syntax highlight) | Server (ships 0 JS) |

Pass Server Components as `children` into Client Components to keep them server-rendered:
```tsx
// ClientShell.tsx
"use client";
export function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section>{/* toggle */}{open && children}</section>;
}
// page.tsx (server)
<Collapsible><ServerRenderedReport /></Collapsible>
```

Props crossing the boundary must be serializable (no functions, class instances, Dates → pass ISO strings).

## Data layer pattern
```ts
// features/users/queries.ts
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
});
```
```ts
// features/users/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { UpdateUserSchema } from "./schema";
import { requireUser } from "@/lib/auth";

export async function updateUser(_: unknown, formData: FormData) {
  const session = await requireUser();                 // authz ALWAYS inside the action
  const parsed = UpdateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  await db.user.update({ where: { id: session.userId }, data: parsed.data });
  revalidatePath("/users");
  return { ok: true };
}
```

## When to use what
- **Server Action**: mutations from your own UI (forms, buttons).
- **Route Handler (`route.ts`)**: webhooks, public/mobile APIs, file streaming, non-React consumers.
- **Middleware**: cheap redirects, locale, auth cookie presence check. Never DB queries.
- **Parallel routes (`@modal`) + intercepting routes**: modals with shareable URLs.

## Layout & loading
- Put session guards in the `(portal)/layout.tsx` but **re-check authorization in every action/query** — layouts don't re-run on client navigation between siblings.
- Add `loading.tsx` per route segment and wrap slow widgets in `<Suspense>` so the shell streams immediately.
- Every segment with data gets `error.tsx` (must be a Client Component).

## Environment config
```ts
// lib/env.ts
import "server-only";
import { z } from "zod";
export const env = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
}).parse(process.env);
```
Only `NEXT_PUBLIC_*` vars reach the browser — treat them as public.

## Anti-patterns
- `"use client"` at the top of `page.tsx` or layouts.
- Fetching your own `/api` route from a Server Component (call the function directly).
- Business logic inside `page.tsx`.
- Giant `utils.ts` dumping grounds.
- Barrel files re-exporting client + server code together (leaks server code / bloats bundles).

## Review checklist
- [ ] Client boundaries are at leaves; no secrets in client files
- [ ] `server-only` on data/auth modules
- [ ] Each data route has `loading.tsx` and `error.tsx`
- [ ] Mutations validate input with zod and check authz
- [ ] Feature folders expose a public `index.ts`
- [ ] env validated at startup
