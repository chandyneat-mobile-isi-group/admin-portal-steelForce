---
name: state-management
description: Choose and implement the right state strategy in React/Next.js — server state (TanStack Query / Server Components), URL state (search params, nuqs), form state (React Hook Form + zod, useActionState), local UI state, and global client state (Zustand, Jotai, Context, Redux Toolkit). Use this skill whenever the user asks where to store data, about Redux/Zustand/Context, prop drilling, syncing filters with the URL, form handling, or data getting out of sync.
---

# State Management

Most "state management problems" are server-state problems wearing a disguise. Classify state first, then use the tool built for that kind.

## Classify
| Kind | Examples | Tool |
|---|---|---|
| **Server state** | users, orders, stats | Server Components; TanStack Query on client |
| **URL state** | filters, sort, page, tab, selected id | `searchParams` / `nuqs` |
| **Form state** | inputs, validation, dirty | React Hook Form + zod, or `useActionState` |
| **Local UI state** | open/closed, hover, input text | `useState` / `useReducer` |
| **Global client state** | theme, sidebar collapsed, cart, wizard draft | Zustand (or Jotai); Context for rarely-changing values |
| **Derived state** | totals, filtered lists | compute during render (`useMemo` if costly) |

Decision rule: *Can it be derived?* → derive. *Should it survive refresh/share?* → URL. *Does it come from the server?* → server cache. *Only then* → client store.

## URL state
```tsx
"use client";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
const [{ q, page, sort }, setParams] = useQueryStates({
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault("createdAt.desc"),
}, { shallow: false, throttleMs: 300 });
```
Server page reads the same params and fetches — filters become shareable and back-button friendly.

## Server state (client side)
Use TanStack Query; never copy query data into `useState` or a global store. Invalidate after mutations. (See api-integration skill.)

## Forms
```tsx
const form = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues });
const onSubmit = form.handleSubmit(async values => {
  const res = await saveAction(values);
  if (!res.ok) Object.entries(res.errors).forEach(([k, v]) => form.setError(k as keyof FormValues, { message: v?.[0] }));
});
```
Simple progressive forms: `useActionState(serverAction, initial)` + `useFormStatus` for pending state. Share the zod schema between client and server.

## Zustand for global client state
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
type UIState = { sidebarCollapsed: boolean; toggleSidebar: () => void };
export const useUI = create<UIState>()(persist(
  set => ({ sidebarCollapsed: false, toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })) }),
  { name: "ui" }
));
// always select narrowly
const collapsed = useUI(s => s.sidebarCollapsed);
```
**Next.js SSR caution:** module-level stores are shared across requests on the server. For per-request/user data, create the store in a Provider (`useRef(createStore(initial))`) instead of a global singleton. Persisted stores can mismatch on hydration — gate rendering or use `skipHydration`.

## Context — when it's fine
Low-frequency values (theme, locale, current user, feature flags). Memoize the value; split state and dispatch contexts. Not for high-frequency updates.

## useReducer for complex local state
```ts
type Action = { type: "next" } | { type: "back" } | { type: "set"; field: keyof Draft; value: string };
function reducer(s: Wizard, a: Action): Wizard { switch (a.type) { /* ... */ } }
```
Model as a state machine (or XState) when there are many states with guarded transitions.

## Redux Toolkit
Reasonable for large teams with existing Redux, complex client workflows, or needing devtools time-travel. Use RTK Query for server state instead of hand-written thunks.

## Anti-patterns
- Duplicating server data in a global store ("sync" bugs)
- `useEffect` to derive state from props
- One giant context for everything
- Filters in `useState` (lost on refresh, not shareable)
- Global singleton store holding user data in SSR

## Checklist
- [ ] Each piece of state classified & in the right tool
- [ ] Filters/pagination in URL
- [ ] No server data copied into client stores
- [ ] Store selectors are narrow
- [ ] Forms share zod schema with server
- [ ] SSR-safe store creation
