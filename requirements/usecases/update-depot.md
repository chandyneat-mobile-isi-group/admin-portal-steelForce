# UC-06 — Update depot

## Use Case Information

| | |
|---|---|
| **Name** | Update depot |
| **Description** | Corrects a depot's master data (name, contact, address, credit terms). Status is never changed here. |
| **Actor** | Back-office user |
| **Roles** | `customers.update` |
| **Preconditions** | Depot exists and is visible to the caller |
| **Trigger** | *No portal screen today.* `depotsRepository.update()` exists with no caller. |

### Main flow

1. The user edits depot fields.
2. The portal calls `PUT /api/v1/customers/{customerId}` with `mapDepotToCustomerPayload(input)`.
3. The backend validates, saves and returns `200 CustomerResponse`.
4. The portal replaces its copy with the mapped response.

### Error flow

- **400** validation · **404** not visible · **409 `General.ConcurrencyConflict`** (row version changed) · **422** business rule (e.g. `Customer.Closed`).

### Business rules

- BR-01: lifecycle changes go through their own endpoints, never through update.
- `code` and `assignedSalesRepId` **cannot** be changed here (BR-10).
- `district`, `country`, `region`, `houseNo` are dropped (M-04).

## API

| | |
|---|---|
| **Method** | `PUT` |
| **Endpoint** | `/api/v1/customers/{customerId}` |
| **Authorization** | `customers.update` |
| **Path** | `customerId` — GUID |
| **Code** | `CustomersController.cs:125` |

### Request body (`UpdateCustomerRequest`)

Same as [UC-05](create-depot.md#request-body-createcustomerrequest) **without** `code` and `assignedSalesRepId`. `name`, `type`, `phone` and `address` (`line1`, `city`) are required.

```json
{
  "name": "Phnom Penh Central Steel Co., Ltd",
  "type": "Retailer",
  "phone": "+85511222333",
  "contactPerson": "Sok Dara",
  "email": "purchasing@ppcsteel.com.kh",
  "creditLimit": 25000,
  "creditTermDays": 30,
  "address": { "line1": "#42, St. 271", "city": "Phnom Penh", "province": "Phnom Penh", "latitude": 11.5432, "longitude": 104.9187 }
}
```

**Portal payload gap:** `mapDepotToCustomerPayload` does not send `type` → **400** once wired (M-02).

### Response — 200

`CustomerResponse` (see [UC-03](get-depot-detail.md)).

### HTTP status codes

`200` · `400` · `401` · `403` · `404` · `409` · `422`

## Backend → Web Portal Mapping

Identical to UC-05 (request) and UC-03 (response).

## Portal status

No UI. `TODO - Backend Confirmation Required`: whether edits are allowed in every status (e.g. while `PendingApproval` or after `Active`, which would change data an approver already reviewed).
