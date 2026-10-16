# 002 — One centralized API client, no invented contract

**Status:** Accepted · **Date:** 2026-08-11
> **Note:** paths in this record predate the `src/` restructure — see
> [ADR 006](./006-src-feature-oriented-structure.md) for the current locations.

## Context

Repositories need HTTP. Left to themselves, each would grow its own token
handling, error shapes, and timeout behavior, and the differences would only
surface in production.

A second pressure: the backend contract does not exist yet. The tempting move is
to guess plausible endpoints (`GET /api/customers`) so code looks finished. A
guess that is wrong is worse than an absence — it compiles, it looks
authoritative, and it is discovered late.

## Decision

One `ApiClient` (`lib/api/client.ts`) owning base URL, bearer token, JSON
handling, timeout, abort, correlation IDs, and error normalization. It knows no
endpoint paths; those belong to the repository calling it.

Errors normalize to `ApiError` with a stable `kind` and a translation-ready
`messageKey`. Raw backend messages are not rendered — they leak implementation
detail and are untranslated. Structured `details` is retained for field-level
mapping.

**No endpoint, DTO, pagination shape, or error schema has been assumed.** With
`NEXT_PUBLIC_API_BASE_URL` unset, the client raises a `configuration` error at
request time rather than falling back to a guessed URL.

## Consequences

Auth, retry, and observability change in one file. A 401 is handled once, via
`onUnauthorized()`, instead of per call site. Correlation IDs make a frontend
report traceable to a backend log line.

Configuration failure is loud rather than a mystery 404 — deliberate, and it
means the app cannot make real requests until someone configures it, which is
the correct state for a client with no backend.

## Alternatives rejected

**axios** — `fetch` covers the need; a dependency for the same functionality is
weight without benefit.

**Placeholder endpoints behind a feature flag** — placeholders get shipped.

**Per-feature clients** — the duplication this decision exists to prevent.
