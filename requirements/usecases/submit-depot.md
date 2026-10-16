# UC-07 — Submit depot for approval

## Use Case Information

| | |
|---|---|
| **Name** | Submit depot for approval |
| **Description** | Moves a depot into the approval queue (`PendingApproval`). |
| **Actor** | Back-office user who created or corrected the depot |
| **Roles** | `customers.update` |
| **Preconditions** | Depot exists and is not `Closed` |
| **Trigger** | *No portal screen today.* `depotsRepository.submit()` exists with no caller. |

### Main flow

1. The user presses Submit on a `Draft` (or `Rejected`) depot.
2. The portal calls `POST /api/v1/customers/{customerId}/submit` (no body).
3. The backend sets `PendingApproval` and returns `204`.
4. The portal re-reads the depot (UC-03) and the queue (UC-02).

### Alternative flows

- **A1 — Already `PendingApproval`:** idempotent, `204`.
- **A2 — Re-submit after rejection:** `Rejected` → `PendingApproval`.

### Error flow

- **404** not visible · **422 `Customer.Closed`**.

### Business rules

- `Customer.SubmitForApproval` (`Customer.cs:660-677`) accepts **every status except `Closed`**, including `Active` and `Suspended`. `TODO - Backend Confirmation Required`: re-submitting an `Active` depot sends a trading account back to the queue; confirm whether that is intended or should be limited to `Draft` / `Rejected`.
- No document check on submit.

## API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/customers/{customerId}/submit` |
| **Authorization** | `customers.update` |
| **Body** | none |
| **Code** | `CustomersController.cs:141` |

```http
POST /api/v1/customers/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/submit
Authorization: Bearer eyJhbGciOi...
```

### Response

`204 No Content`.

### HTTP status codes

`204` · `401` · `403` · `404` · `422 Customer.Closed`

## Backend → Web Portal Mapping

No body. Repository signature `submit(id): Promise<void>` matches.

| Before | After |
|---|---|
| `Draft`, `Rejected`, `Suspended`, `Active`, `PendingApproval`, `RegionManagerApproved`, `SalesManagerApproved` | `PendingApproval` |

## Portal status

No UI.
