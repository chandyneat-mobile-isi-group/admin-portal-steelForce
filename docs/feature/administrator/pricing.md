# Pricing — for Administrator

**Can call:** 4 of 4 endpoints
**Permissions held here:** `customers.read`, `customers.sync`
**Full feature docs:** [../../pricing/](../../pricing/) · [integration.md](../../pricing/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=customers.read`, `isi:permission=customers.sync`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/pricing/customers/{customerId}` | `customers.read` |
| `GET` | `/api/v1/pricing/customers/{customerId}` | `customers.read` |
| `POST` | `/api/v1/pricing/customers/{customerId}/publish` | `customers.read` |
| `GET` | `/api/v1/pricing/diagnostics/raw` | `customers.sync` |

---

## Related

- [Administrator overview](README.md)
- [../../pricing/integration.md](../../pricing/integration.md) — the same feature for every role
