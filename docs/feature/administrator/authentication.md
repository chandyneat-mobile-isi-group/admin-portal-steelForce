# Authentication — for Administrator

**Can call:** 18 of 18 endpoints
**Permissions held here:** none needed — a valid token is enough
**Full feature docs:** [../../authentication/](../../authentication/) · [integration.md](../../authentication/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. This **is** the sign-in feature — every other file in this folder depends on it.
2. Send `Authorization: Bearer <token>` on every request below.
3. No permission claim is needed here.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/auth/me` | — (any token) |
| `POST` | `/api/v1/auth/logout` | — (any token) |
| `POST` | `/api/v1/auth/change-password` | — (any token) |
| `POST` | `/api/v1/auth/forgot-password` | — (any token) |
| `POST` | `/api/v1/auth/reset-password` | — (any token) |
| `POST` | `/api/v1/auth/verify-email` | — (any token) |
| `POST` | `/api/v1/auth/resend-verification` | — (any token) |
| `GET` | `/api/v1/auth/sessions` | — (any token) |
| `DELETE` | `/api/v1/auth/sessions/{sessionId}` | — (any token) |
| `POST` | `/api/v1/mobile/auth/forgot-password` | — (any token) |
| `POST` | `/api/v1/mobile/auth/verify-reset-code` | — (any token) |
| `POST` | `/api/v1/mobile/auth/resend-reset-code` | — (any token) |
| `POST` | `/api/v1/mobile/auth/reset-password` | — (any token) |
| `POST` | `/~/api/v1/auth/login` | — (any token) |
| `POST` | `/~/api/v1/auth/refresh` | — (any token) |
| `POST` | `/~/api/v1/mobile/auth/login` | — (any token) |
| `POST` | `/~/api/v1/auth/token` | — (any token) |
| `POST` | `/~/connect/token` | — (any token) |

---

## Related

- [Administrator overview](README.md)
- [../../authentication/integration.md](../../authentication/integration.md) — the same feature for every role
