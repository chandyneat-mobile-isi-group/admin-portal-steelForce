# UC-10 — Suspend / reinstate depot

## Use Case Information

| | |
|---|---|
| **Name** | Suspend depot · Reinstate depot |
| **Description** | Temporarily stops an active trading account, or returns a suspended one to trading. |
| **Actor** | Approver |
| **Roles** | `customers.approve` |
| **Preconditions** | Suspend: status `Active`. Reinstate: status `Suspended`. |
| **Trigger** | *No portal screen today.* `depotsRepository.suspend()` / `reinstate()` exist with no caller. |

### Main flow — suspend

1. The user chooses Suspend and (per the backend) must enter a reason.
2. `POST /api/v1/customers/{customerId}/suspend` with `{ "reason": "…" }`.
3. `Active` → `Suspended`; `204`.
4. The portal re-reads the depot. `Depot.status` (CRM) becomes `At Risk`; `lifecycle` becomes `Suspended`.

### Main flow — reinstate

1. `POST /api/v1/customers/{customerId}/reinstate` (no body).
2. `Suspended` → `Active`; `204`.

### Error flow

- **400** reason missing / out of range · **404** · **403** · **422 `Customer.NotActive`** ("Only an active customer can be suspended.") · **422 `Customer.NotSuspended`** ("Only a suspended customer can be reinstated.").

### Business rules

- Suspension does not touch SAP. `TODO - Backend Confirmation Required`: whether suspending should also block the customer in SAP (`orderBlock` / `salesBlock`).

## API

| | Suspend | Reinstate |
|---|---|---|
| **Method** | `POST` | `POST` |
| **Endpoint** | `/api/v1/customers/{customerId}/suspend` | `/api/v1/customers/{customerId}/reinstate` |
| **Authorization** | `customers.approve` | `customers.approve` |
| **Body** | `SuspendCustomerRequest { reason }` | none |
| **Response** | `204` | `204` |
| **Code** | `CustomersController.cs:184` | `CustomersController.cs:201` |

```json
{ "reason": "Overdue payment beyond 90 days" }
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | yes (backend) | 3–512 characters |

**Portal mismatch:** `depotsRepository.suspend(id, reason?)` treats the reason as optional and sends **no body** when it is empty → 400 once wired.

### HTTP status codes

`204` · `400` · `401` · `403` · `404` · `422`

## Backend → Web Portal Mapping

No response body. After re-read (UC-03): `status: "Suspended"` → `Depot.lifecycle = 'Suspended'`, `Depot.status = 'At Risk'`, `canTrade = false`.

## Portal status

No UI.
