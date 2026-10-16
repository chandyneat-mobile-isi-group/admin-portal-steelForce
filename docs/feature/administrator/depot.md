# Depot / Customers — for Administrator

**Can call:** 43 of 43 endpoints
**Permissions held here:** `approvals.head`, `approvals.region`, `approvals.sales`, `customers.approve`, `customers.audit`, `customers.create`, `customers.delete`, `customers.read`, `customers.sync`, `customers.update`
**Full feature docs:** [../../depot/](../../depot/) · [integration.md](../../depot/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=approvals.head`, `isi:permission=approvals.region`, `isi:permission=approvals.sales`, `isi:permission=customers.approve`, `isi:permission=customers.audit`, `isi:permission=customers.create`, `isi:permission=customers.delete`, `isi:permission=customers.read`, `isi:permission=customers.sync`, `isi:permission=customers.update`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/depots` | `customers.read` |
| `GET` | `/api/v1/mobile/depots/{customerId}` | `customers.read` |
| `GET` | `/api/v1/mobile/depots/{customerId}/stop-information` | `customers.read` |
| `POST` | `/api/v1/mobile/depots` | `customers.create` |
| `POST` | `/api/v1/mobile/depots/business-partner` | `customers.create` |
| `PUT` | `/api/v1/mobile/depots/{customerId}` | `customers.update` |
| `DELETE` | `/api/v1/mobile/depots/{customerId}` | `customers.delete` |
| `GET` | `/api/v1/mobile/depots/references` | `customers.read` |
| `POST` | `/api/v1/mobile/depots/draft` | `customers.create` |
| `POST` | `/api/v1/mobile/depots/update` | `customers.create` |
| `POST` | `/api/v1/mobile/depots/submit` | `customers.create` |
| `GET` | `/api/v1/mobile/depots/drafts` | `customers.create` |
| `GET` | `/api/v1/mobile/depots/draft/active` | `customers.create` |
| `GET` | `/api/v1/mobile/depots/draft/{draftId}` | `customers.create` |
| `DELETE` | `/api/v1/mobile/depots/draft/{draftId}` | `customers.create` |
| `POST` | `/api/v1/mobile/depots/{customerId}/documents` | `customers.create` |
| `GET` | `/api/v1/mobile/depots/{customerId}/documents` | `customers.read` |
| `GET` | `/api/v1/mobile/depots/{customerId}/documents/{documentId}/content` | `customers.read` |
| `DELETE` | `/api/v1/mobile/depots/{customerId}/documents/{documentId}` | `customers.update` |
| `POST` | `/api/v1/mobile/depots/{customerId}/region-manager/approve` | `approvals.region` |
| `POST` | `/api/v1/mobile/depots/{customerId}/sales-manager/approve` | `approvals.sales` |
| `POST` | `/api/v1/mobile/depots/{customerId}/head-of-sales/approve` | `approvals.head` |
| `POST` | `/api/v1/mobile/depots/{customerId}/reject` | `approvals.region` |
| `GET` | `/api/v1/mobile/depots/{customerId}/approval-history` | `customers.audit` |
| `GET` | `/api/v1/customers` | `customers.read` |
| `GET` | `/api/v1/customers/{customerId}` | `customers.read` |
| `POST` | `/api/v1/customers` | `customers.create` |
| `PUT` | `/api/v1/customers/{customerId}` | `customers.update` |
| `POST` | `/api/v1/customers/{customerId}/submit` | `customers.update` |
| `POST` | `/api/v1/customers/{customerId}/approve` | `customers.approve` |
| `POST` | `/api/v1/customers/{customerId}/suspend` | `customers.approve` |
| `POST` | `/api/v1/customers/{customerId}/reinstate` | `customers.approve` |
| `DELETE` | `/api/v1/customers/{customerId}` | `customers.delete` |
| `GET` | `/api/v1/customers/by-code/{customerCode}` | `customers.read` |
| `POST` | `/api/v1/customers/sync-sap` | `customers.sync` |
| `POST` | `/api/v1/customers/sap/sync-references` | `customers.sync` |
| `GET` | `/api/v1/customers/sap/status` | `customers.sync` |
| `GET` | `/api/v1/customers/sap/rejected` | `customers.sync` |
| `POST` | `/api/v1/customers/sap/retry-rejected` | `customers.sync` |
| `POST` | `/api/v1/customers/sap/{customerId}/submit` | `customers.sync` |
| `POST` | `/api/v1/customers/sap/{customerId}/register` | `customers.sync` |
| `PUT` | `/api/v1/customers/sap/{customerId}` | `customers.sync` |
| `POST` | `/api/v1/customers/sap/push-pending` | `customers.sync` |

---

## Related

- [Administrator overview](README.md)
- [../../depot/integration.md](../../depot/integration.md) — the same feature for every role
