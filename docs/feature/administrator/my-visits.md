# My Visits — for Administrator

**Can call:** 5 of 5 endpoints
**Permissions held here:** `visits.create`, `visits.read`
**Full feature docs:** [../../my-visits/](../../my-visits/) · [integration.md](../../my-visits/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=visits.create`, `isi:permission=visits.read`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/visits/routes` | `visits.read` |
| `GET` | `/api/v1/mobile/visits/routes/delta` | `visits.read` |
| `POST` | `/api/v1/mobile/visits/push` | `visits.create` |
| `POST` | `/api/v1/mobile/visits/telemetry` | `visits.create` |
| `POST` | `/api/v1/mobile/visits/photos` | `visits.create` |

---

## Related

- [Administrator overview](README.md)
- [../../my-visits/integration.md](../../my-visits/integration.md) — the same feature for every role
