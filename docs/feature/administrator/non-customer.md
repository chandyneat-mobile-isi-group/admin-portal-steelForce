# Non-customers — for Administrator

**Can call:** 6 of 6 endpoints
**Permissions held here:** `customers.audit`, `noncustomers.approve`, `noncustomers.create`, `noncustomers.read`
**Full feature docs:** [../../non-customer/](../../non-customer/) · [integration.md](../../non-customer/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=customers.audit`, `isi:permission=noncustomers.approve`, `isi:permission=noncustomers.create`, `isi:permission=noncustomers.read`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/non-customers` | `noncustomers.read` |
| `GET` | `/api/v1/mobile/non-customers/{nonCustomerId}` | `noncustomers.read` |
| `POST` | `/api/v1/mobile/non-customers` | `noncustomers.create` |
| `POST` | `/api/v1/mobile/non-customers/{nonCustomerId}/manager/approve` | `noncustomers.approve` |
| `POST` | `/api/v1/mobile/non-customers/{nonCustomerId}/manager/reject` | `noncustomers.approve` |
| `GET` | `/api/v1/mobile/non-customers/{nonCustomerId}/approval-history` | `customers.audit` |

---

## Related

- [Administrator overview](README.md)
- [../../non-customer/integration.md](../../non-customer/integration.md) — the same feature for every role
