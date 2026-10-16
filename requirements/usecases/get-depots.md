# UC-01 — Get depots

## Use Case Information

| | |
|---|---|
| **Name** | Get depots |
| **Description** | Returns one page of the depot directory, optionally searched and filtered. Backs the Depots page and My Depots. |
| **Actor** | Portal user |
| **Roles** | any role holding `customers.readall` (Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Supervisor, Finance, Warehouse, Executive) |
| **Preconditions** | Signed in; token carries `customers.readall`; portal flag `NEXT_PUBLIC_DEPOTS_API=true` |
| **Trigger** | Opening `/depots` or `/depots/my`; typing in search (300 ms debounce); choosing a status filter; paging |

### Main flow

1. The user opens `/depots`.
2. The portal calls `depotsRepository.list({ page, pageSize: 200, search, lifecycle })`.
3. The repository sends `GET /api/v1/admin/depots?pageNumber=…&pageSize=200&search=…&status=…`.
4. The backend returns one page of `CustomerListItemResponse` rows and `meta.pagination`.
5. Each row is mapped with `mapCustomerToDepot()`; the page total comes from `meta.pagination.totalCount`.
6. The list renders; the first row is selected and its detail is loaded (UC-03).

### Alternative flows

- **A1 — My Depots:** `/depots/my` calls `list({ scope: 'assigned' })`; the repository turns that into `assignedSalesRepId = <current user id>`. No `pageSize` is passed, so the default 200 applies, and **only page 1 is requested**. All filters on that page (status, province, type, rep, follow-up, revenue, search, column sort) run client-side.
- **A2 — Explicit rep filter:** `salesRepId` in the query wins over `scope`.
- **A3 — No results:** "No depots found" with "Nothing matches that search." or "No depots have been registered yet."

### Error flow

- **E1 — 403** (no `customers.readall`, e.g. Sales Representative, Sales Rep Regional): `ErrorState` with retry. Note the portal route only requires `customers.view`, so these users can open the page and then fail — `TODO - Permission confirmation required`.
- **E2 — network / timeout / 5xx:** `ErrorState` with retry.

### Business rules

- BR-09: `/admin/depots` applies **no row scoping**; visibility is purely `customers.readall`.
- Unknown `status` values are ignored by the backend (not an error).
- The list projection is thin (no address, no rep, no documents).

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/admin/depots` |
| **Authentication** | Bearer access token |
| **Authorization** | `customers.readall` |
| **Code** | `AdminDepotsController.cs:73`, `GetAdminDepotsQuery.cs:52-181` |

### Query parameters

| Name | Type | Required | Default | Rules | Portal sends |
|---|---|---|---|---|---|
| `pageNumber` | int | no | 1 | ≥ 1 | yes |
| `pageSize` | int | no | 100 | clamped 1..1000; ≤0 → 100 | 200 |
| `search` | string | no | — | case-insensitive match on name, code, city | trimmed, omitted if empty |
| `status` | string | no | — | `CustomerStatus` name; unknown ignored | lifecycle filter, or CRM status translated by `depotStatusToWire` |
| `type` | string | no | — | `Retailer` \| `Wholesaler` \| `Distributor` \| `KeyAccount` | never |
| `assignedSalesRepId` | GUID | no | — | — | My Depots only |
| `sort` | string | no | `-createdAt` | fields `code`,`name`,`status`,`type`,`city`,`createdAt`; comma list; `-` = desc | `query.sort` (not set by any screen) |

No date, location or multi-status filter exists.

### Request example

```http
GET /api/v1/admin/depots?pageNumber=1&pageSize=200&search=Phnom&status=PendingApproval
Authorization: Bearer eyJhbGciOi...
```

### Response — 200

```json
{
  "data": [
    {
      "id": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
      "code": "BP-202609-00012",
      "name": "Phnom Penh Central Steel",
      "type": "Retailer",
      "status": "PendingApproval",
      "city": "Phnom Penh",
      "phone": "+85511222333",
      "documents": [],
      "missingRequiredDocuments": [],
      "documentsComplete": true,
      "documentCount": 0
    }
  ],
  "meta": {
    "correlationId": "0HN6S2Q4B7K1M:00000003",
    "timestamp": "2026-09-25T03:30:00Z",
    "pagination": {
      "pageNumber": 1,
      "pageSize": 200,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### Response fields (`CustomerListItemResponse`)

| Backend field | Type | Required | Description |
|---|---|---|---|
| `id` | GUID string | yes | depot id |
| `code` | string | yes | trading code; `BP-YYYYMM-NNNNN` until SAP registration, then the SAP number |
| `name` | string | yes | localised name (Khmer / English / base) |
| `type` | string | yes | `CustomerType` name |
| `status` | string | yes | `CustomerStatus` name |
| `city` | string | yes | address city |
| `phone` | string | yes | |
| `documents` | array | yes | **always `[]` on this endpoint** |
| `missingRequiredDocuments` | string[] | yes | **always `[]` on this endpoint** |
| `documentsComplete` | bool | yes | computed from the two above → **always `true` here** (GAP-03) |
| `documentCount` | int | yes | **always `0` here** |

### HTTP status codes

`200` · `401` · `403`

## Backend → Web Portal Mapping

Portal type: `CustomerListItemDto` → `Depot` via `mapCustomerToDepot()` (`src/features/depots/repositories/mappers.ts`). Page: `PageResult<Depot> { items, total, nextCursor }`.

| Backend | Portal | Mapping / note |
|---|---|---|
| `id` | `id` | as is |
| `code` | `code` | as is |
| `name` | `name` | as is |
| `type` | `type` | `depotTypeFromWire` (see README §12) |
| `status` | `lifecycle` | `lifecycleFromWire` |
| `status` | `status` | `depotStatusFromWire` — `Rejected`, `RegionManagerApproved`, `SalesManagerApproved` fall back to `Prospect` (M-14) |
| `city` | `address` | used because list rows have no `address` object |
| `phone` | `phone` | `null` → `''` |
| — | `lat`, `lng` | **`0`** (no coordinates on list rows; M-13) |
| — | `repId` | **`''`** (no `assignedSalesRepId` on list rows; M-11, GAP-05) |
| `documentsComplete`, `missingRequiredDocuments` | same | misleading values (GAP-03) |
| `meta.pagination.totalCount` | `PageResult.total` | falls back to row count |
| `meta.pagination.hasNextPage` | `PageResult.nextCursor` | `String(pageNumber + 1)` or `null` |

UI: `/depots` computes `lastPage = ceil(total / 200)` and shows "Page X of Y".

## Portal status

Implemented. Mismatches: M-08 (the "Awaiting approval" filter sends only `PendingApproval`), M-11, M-13, M-14, M-22 (My Depots reads only the first 200 rows).
