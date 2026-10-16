# Quotations & Orders — for Administrator

**Can call:** 21 of 21 endpoints
**Permissions held here:** `quotations.approve`, `quotations.create`, `quotations.read`, `quotations.sap`, `quotations.update`
**Full feature docs:** [../../quotation-orders/](../../quotation-orders/) · [integration.md](../../quotation-orders/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=quotations.approve`, `isi:permission=quotations.create`, `isi:permission=quotations.read`, `isi:permission=quotations.sap`, `isi:permission=quotations.update`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/quotations` | `quotations.read` |
| `GET` | `/api/v1/mobile/quotations/{quotationId}` | `quotations.read` |
| `POST` | `/api/v1/mobile/quotations` | `quotations.create` |
| `PUT` | `/api/v1/mobile/quotations/{quotationId}` | `quotations.update` |
| `POST` | `/api/v1/mobile/quotations/{quotationId}/lines` | `quotations.update` |
| `PUT` | `/api/v1/mobile/quotations/{quotationId}/lines/{lineId}` | `quotations.update` |
| `DELETE` | `/api/v1/mobile/quotations/{quotationId}/lines/{lineId}` | `quotations.update` |
| `PUT` | `/api/v1/mobile/quotations/{quotationId}/discounts` | `quotations.update` |
| `GET` | `/api/v1/mobile/quotations/{quotationId}/preview` | `quotations.read` |
| `POST` | `/api/v1/mobile/quotations/{quotationId}/reprice` | `quotations.update` |
| `POST` | `/api/v1/mobile/quotations/{quotationId}/submit` | `quotations.create` |
| `POST` | `/api/v1/mobile/quotations/{quotationId}/cancel` | `quotations.update` |
| `GET` | `/api/v1/mobile/quotations/{quotationId}/history` | `quotations.read` |
| `GET` | `/api/v1/quotations` | `quotations.read` |
| `GET` | `/api/v1/quotations/{quotationId}` | `quotations.read` |
| `GET` | `/api/v1/quotations/{quotationId}/history` | `quotations.read` |
| `POST` | `/api/v1/quotations/{quotationId}/approve` | `quotations.approve` |
| `POST` | `/api/v1/quotations/{quotationId}/return` | `quotations.approve` |
| `POST` | `/api/v1/quotations/{quotationId}/submit-to-sap` | `quotations.sap` |
| `GET` | `/api/v1/quotations/{quotationId}/sap-submissions` | `quotations.sap` |
| `POST` | `/api/v1/quotations/{quotationId}/reject` | `quotations.approve` |

---

## Related

- [Administrator overview](README.md)
- [../../quotation-orders/integration.md](../../quotation-orders/integration.md) — the same feature for every role
