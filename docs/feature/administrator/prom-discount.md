# Promotions & Discounts — for Administrator

**Can call:** 21 of 21 endpoints
**Permissions held here:** `agreements.read`, `agreements.readall`, `agreements.request`, `agreements.sap`, `agreements.terminate`, `customers.read`, `promotions.configure`
**Full feature docs:** [../../prom-discount/](../../prom-discount/) · [integration.md](../../prom-discount/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=agreements.read`, `isi:permission=agreements.readall`, `isi:permission=agreements.request`, `isi:permission=agreements.sap`, `isi:permission=agreements.terminate`, `isi:permission=customers.read`, `isi:permission=promotions.configure`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/customers/{customerId}/incentives` | `customers.read` |
| `GET` | `/api/v1/mobile/customers/{customerId}/agreements` | `customers.read` |
| `GET` | `/api/v1/mobile/me/discount-authority` | — (any token) |
| `GET` | `/api/v1/mobile/category-mappings` | `agreements.read` |
| `GET` | `/api/v1/mobile/agreement-requests` | `agreements.read` |
| `GET` | `/api/v1/mobile/agreement-requests/{requestId}` | `agreements.read` |
| `POST` | `/api/v1/mobile/agreement-requests` | `agreements.request` |
| `PUT` | `/api/v1/mobile/agreement-requests/{requestId}` | `agreements.request` |
| `POST` | `/api/v1/mobile/agreement-requests/{requestId}/submit` | `agreements.request` |
| `POST` | `/api/v1/mobile/agreement-requests/{requestId}/withdraw` | `agreements.request` |
| `GET` | `/api/v1/agreement-requests` | `agreements.read` |
| `GET` | `/api/v1/agreement-requests/{requestId}` | `agreements.read` |
| `POST` | `/api/v1/agreement-requests/{requestId}/steps/{stepOrder}/{outcome}` | `agreements.read` |
| `GET` | `/api/v1/agreement-terms` | `agreements.readall` |
| `POST` | `/api/v1/agreement-terms/{termId}/terminate` | `agreements.terminate` |
| `GET` | `/api/v1/sap-tasks` | `agreements.sap` |
| `POST` | `/api/v1/sap-tasks/{taskId}/done` | `agreements.sap` |
| `GET` | `/api/v1/settings/category-mappings` | `agreements.read` |
| `PUT` | `/api/v1/settings/category-mappings` | `promotions.configure` |
| `GET` | `/api/v1/settings/pickup-rules` | `agreements.read` |
| `PUT` | `/api/v1/settings/pickup-rules` | `promotions.configure` |

---

## Related

- [Administrator overview](README.md)
- [../../prom-discount/integration.md](../../prom-discount/integration.md) — the same feature for every role
