---
name: error-handling
description: Handle errors robustly across a Next.js/React app — error.tsx and global-error boundaries, not-found, typed domain errors, Server Action error results, API error envelopes, form error display, retries, user-friendly messages, and reporting to Sentry. Use this skill whenever the user deals with exceptions, crashes, error pages, try/catch, failed requests, error messages, 404/500 pages, or wants the app to "fail gracefully".
---

# Error Handling

Distinguish **expected** failures (validation, not found, permission, conflict) from **unexpected** ones (bugs, outages). Expected → return and show clearly. Unexpected → throw, catch at a boundary, report, show a safe fallback.

## Error taxonomy
```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 500, public expose = false, options?: ErrorOptions) {
    super(message, options); this.name = new.target.name;
  }
}
export class ValidationError extends AppError { constructor(public fields: Record<string, string[]>) { super("VALIDATION", "Invalid input", 400, true); } }
export class UnauthorizedError extends AppError { constructor() { super("UNAUTHORIZED", "Please sign in", 401, true); } }
export class ForbiddenError extends AppError { constructor(what = "this resource") { super("FORBIDDEN", `You don't have access to ${what}`, 403, true); } }
export class NotFoundError extends AppError { constructor(what = "Resource") { super("NOT_FOUND", `${what} not found`, 404, true); } }
export class ConflictError extends AppError { constructor(msg: string) { super("CONFLICT", msg, 409, true); } }
```
Always preserve the cause: `throw new AppError("PAYMENT_FAILED", "…", 502, false, { cause: e })`.

## Server Actions: return, don't throw, for expected errors
```ts
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createProject(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = Schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields", fieldErrors: parsed.error.flatten().fieldErrors };
    const p = await db.project.create({ data: { ...parsed.data, orgId: user.orgId } });
    revalidatePath("/projects");
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "A project with that name already exists" };
    if (e instanceof AppError && e.expose) return { ok: false, error: e.message };
    logger.error({ err: e }, "createProject failed");
    Sentry.captureException(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
```
Note: `redirect()` and `notFound()` throw special errors — call them outside `try/catch` or rethrow (`unstable_rethrow(e)`).

## Route Handlers: consistent envelope
```ts
export function withErrors(handler: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    const requestId = crypto.randomUUID();
    try { return await handler(req, ctx); }
    catch (e) {
      if (e instanceof ZodError) return Response.json({ code: "VALIDATION", message: "Invalid input", details: e.flatten(), requestId }, { status: 400 });
      if (e instanceof AppError && e.expose) return Response.json({ code: e.code, message: e.message, requestId }, { status: e.status });
      logger.error({ err: e, requestId }, "unhandled");
      return Response.json({ code: "INTERNAL", message: "Internal error", requestId }, { status: 500 });
    }
  };
}
```
Never leak stack traces, SQL, or internal messages to clients.

## Boundaries (App Router)
```tsx
// app/(portal)/projects/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <div role="alert" className="p-8 text-center">
      <h2 className="text-lg font-semibold">We couldn't load projects</h2>
      <p className="text-muted-foreground">Please try again. Reference: {error.digest}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```
- `error.tsx` per data segment so the shell survives.
- `app/global-error.tsx` (with its own `<html><body>`) for root layout failures.
- `not-found.tsx` + `notFound()` for missing resources.
- Widget-level: `react-error-boundary` around independent client widgets so one broken chart doesn't blank the page.

## Client-side
- TanStack Query: render `error` states; global `QueryCache({ onError })` for toasts on background refetch failures only.
- Map error codes to friendly copy in one place.
- Offline: detect `navigator.onLine`, show banner, queue or disable writes.
- Unhandled promise rejections/`window.onerror` captured by Sentry.

## User-facing messages
Say what happened, why (if known), and what to do next. Keep form input on failure. Offer retry for transient errors; contact/support link with reference ID for persistent ones.

## Retries
Retry transient (network, 5xx, 429) with exponential backoff + jitter; don't retry 4xx. Make operations idempotent.

## Reporting
- Sentry (`@sentry/nextjs`) with source maps, release, environment, user id (no PII beyond policy).
- Tag with `requestId`/`digest` so users' reference codes map to logs.
- Filter noise (browser extensions, ResizeObserver loop, aborted requests).

## Anti-patterns
- Empty `catch {}` / swallowing errors
- `catch (e) { console.log(e) }` in production paths
- Throwing strings
- Showing raw `error.message` from the server
- One global error page for everything

## Checklist
- [ ] Typed error classes; causes preserved
- [ ] Actions return typed results for expected failures
- [ ] Consistent API envelope with requestId
- [ ] error.tsx per segment + global-error + not-found
- [ ] Friendly, actionable messages; inputs preserved
- [ ] Errors reported with context; no sensitive data
