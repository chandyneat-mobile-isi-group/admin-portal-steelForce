# UC-15 — Get NON-BP depots

## Use Case Information

| | |
|---|---|
| **Name** | Get NON-BP depots |
| **Description** | Lists prospects — shops captured in the field that have no SAP business-partner number and are not in the customer master. |
| **Actor** | Back-office user |
| **Roles** | `noncustomers.readall` — Administrator, Head of Sales, Sales Manager, Sales Rep Manager. Portal route requires `customers.view`. |
| **Preconditions** | Signed in; `NEXT_PUBLIC_DEPOTS_API=true` |
| **Trigger** | Opening `/depots/non-bp`; searching; paging |

### Main flow

1. `nonBpDepotsRepository.list({ page, pageSize: 200, search })`.
2. `GET /api/v1/admin/non-bp-depots?pageNumber=…&pageSize=200&search=…`.
3. Rows are used **as is** (no mapper — the DTO is the model).
4. The page lists them and shows the selected one's details.

### Alternative flows

- **A1 — Empty:** "No NON-BP depots".

### Error flow

- **403** for users with `customers.view` but no `noncustomers.readall` (e.g. Supervisor, Finance, Warehouse, Executive, Sales Rep Regional, Sales Representative) → error state. `TODO - Permission confirmation required`: the route guard and the API permission disagree.

### Business rules

- Always sorted newest first; no `sort` parameter.
- Read-only in the portal. Approve/reject exist only on `/api/v1/mobile/non-customers/{id}/manager/approve|reject` (`noncustomers.approve`, from `Pending` only). **No conversion to a depot exists** (`MarkConverted` has no caller), so `Converted` never occurs. README Q10.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/admin/non-bp-depots` |
| **Authorization** | `noncustomers.readall` |
| **Code** | `AdminNonBpDepotsController.cs:59`, `GetAdminNonBpDepotsQuery.cs:41-120` |

### Query parameters

| Name | Type | Default | Rules | Portal sends |
|---|---|---|---|---|
| `pageNumber` | int | 1 | ≥1 | yes |
| `pageSize` | int | 100 | max 1000 | 200 |
| `search` | string | — | name, code, phone, city | yes |
| `status` | string | — | `Pending` \| `Approved` \| `Rejected` \| `Converted` | declared, not sent by the page |
| `createdBySalesRepId` | GUID | — | | declared, not sent |
| `territoryCode` | string | — | | declared, not sent |

### Response — 200

```json
{
  "data": [
    {
      "id": "e4b1f7a2-5c3d-4e8f-9a0b-1c2d3e4f5a6b",
      "name": "Chea Sambath Iron Works",
      "code": null,
      "phone": "+85593456789",
      "email": null,
      "contactPerson": "Chea Sambath",
      "addressLine1": "National Road 5",
      "city": "Battambang",
      "district": "Sangkae",
      "province": "Battambang",
      "latitude": 13.0957,
      "longitude": 103.2022,
      "description": "Small fabrication shop, buys angle bar weekly",
      "outletType": "Hardware",
      "targetProduct": "Angle bar",
      "estimatedPotential": 3000,
      "status": "Pending",
      "createdBySalesRepId": "0f8b1c55-3d7e-4f21-9c0a-6b2e7d1a4c33",
      "territoryCode": "BTB",
      "servingCustomerId": null,
      "approvedBy": null,
      "approvedAt": null,
      "rejectedBy": null,
      "rejectedAt": null,
      "rejectionReason": null,
      "convertedCustomerId": null,
      "createdAt": "2026-09-17T02:00:00Z"
    }
  ],
  "meta": { "pagination": { "pageNumber": 1, "pageSize": 200, "totalCount": 1, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false } }
}
```

`convertedAt` is declared by the portal type but **not sent** by the backend.

### HTTP status codes

`200` · `401` · `403`

## Backend → Web Portal Mapping

Portal type `NonBpDepot` (`src/features/depots/repositories/non-bp-types.ts`) mirrors `NonCustomerDto`:

| Backend | Portal | Match |
|---|---|---|
| `id`, `name`, `addressLine1`, `city`, `status`, `createdBySalesRepId` | same, non-null | ✓ |
| `code`, `phone`, `email`, `contactPerson`, `district`, `province`, `latitude`, `longitude`, `description`, `outletType`, `targetProduct`, `estimatedPotential`, `territoryCode`, `servingCustomerId`, `approvedBy`, `approvedAt` | same, `\| null` | ✓ |
| `rejectedBy`, `rejectedAt`, `rejectionReason`, `convertedCustomerId`, `createdAt` | same, optional | ✓ |
| — | `convertedAt?` | ✗ not sent |
| `meta.pagination.totalCount` / `hasNextPage` | `PageResult.total` / `nextCursor` | ✓ |

## Portal status

Implemented (read-only).
