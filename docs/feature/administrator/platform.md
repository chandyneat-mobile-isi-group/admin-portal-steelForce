# Platform — for Administrator

**Can call:** 5 of 5 endpoints
**Permissions held here:** `audit.read`
**Full feature docs:** [../../platform/](../../platform/) · [integration.md](../../platform/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=audit.read`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/system/version` | — (any token) |
| `GET` | `/api/v1/system/diagnostics` | `audit.read` |
| `GET` | `/api/v1/system/languages` | — (any token) |
| `PUT` | `/api/v1/users/preferences/language` | — (any token) |
| `GET` | `/files/customers/{publicToken}` | — (any token) |

---

## Related

- [Administrator overview](README.md)
- [../../platform/integration.md](../../platform/integration.md) — the same feature for every role
