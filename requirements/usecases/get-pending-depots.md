# UC-02 — Get depots awaiting approval

## Use Case Information

| | |
|---|---|
| **Name** | Get depots awaiting approval |
| **Description** | Returns depot registrations that still need a decision: every depot in `PendingApproval`, `RegionManagerApproved` or `SalesManagerApproved`. |
| **Actor** | Approver |
| **Roles** | any role with `customers.readall` (to list). Portal route `/approval/depots` requires `customers.manage`. |
| **Preconditions** | Signed in with `customers.readall` |
| **Trigger** | Opening `/approval` (hub count) or `/approval/depots` (queue) |

### Main flow (approval hub — implemented)

1. `/approval` renders; if `can('customers.manage')`, `usePendingDepots(PREVIEW_ROWS)` runs.
2. `approvalsApi.pendingDepots(pageSize)` sends `GET /api/v1/admin/depots/pending-approval?pageSize=…`.
3. `unwrapPage()` turns the envelope into `{ items, totalCount }`; Zod `DepotPageSchema` validates it.
4. The hub shows the count (`totalCount`) and preview rows linking to `/approval/depots/{id}`.

### Main flow (queue page — required, not implemented)

1. `/approval/depots` should call the same endpoint with paging and search.
2. Each row links to `/approval/depots/{id}` with the depot **GUID**.

Today the queue renders a hard-coded `MOCK_DEPOTS` array with ids such as `REQ-D-8821`; its approve/reject buttons change local state only, and its links fail on the decision page (the API requires a GUID). See M-05.

### Alternative flows

- **A1 — Nothing pending:** "No pending depot requests require your approval."
- **A2 — User lacks `customers.manage`:** the hub skips the query and shows no depot card.

### Error flow

- **E1 — 403:** the hub query fails; the card shows no count.
- **E2 — network/5xx:** same.

### Business rules

- The three statuses are fixed by the backend; `status` and `type` are not accepted here.
- Documents are **not** filled on these rows (GAP-03), so a "documents incomplete" badge cannot be computed from this endpoint.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/admin/depots/pending-approval` |
| **Authentication** | Bearer |
| **Authorization** | `customers.readall` |
| **Code** | `AdminDepotsController.cs:110` |

### Query parameters

Same as UC-01 without `status` and `type`: `pageNumber` (1), `pageSize` (100, max 1000), `search`, `assignedSalesRepId`, `sort`.

The portal sends only `pageSize` (default 50).

### Request example

```http
GET /api/v1/admin/depots/pending-approval?pageNumber=1&pageSize=50
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
    },
    {
      "id": "c2a4f0d9-8b31-4e7a-a1f6-0e5d93b2c7aa",
      "code": "BP-202609-00009",
      "name": "Sokha Building Materials",
      "type": "Wholesaler",
      "status": "RegionManagerApproved",
      "city": "Siem Reap",
      "phone": "+85512345678",
      "documents": [],
      "missingRequiredDocuments": [],
      "documentsComplete": true,
      "documentCount": 0
    }
  ],
  "meta": {
    "pagination": { "pageNumber": 1, "pageSize": 50, "totalCount": 2, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
  }
}
```

Fields: `CustomerListItemResponse`, identical to [UC-01](get-depots.md#response-fields-customerlistitemresponse).

### HTTP status codes

`200` · `401` · `403`

## Backend → Web Portal Mapping

Portal type: `PendingDepotDto` (Zod `PendingDepotSchema`, `src/features/approvals/api.ts`), page `{ items: PendingDepotDto[], totalCount: number }`.

| Backend | Portal `PendingDepotDto` | Note |
|---|---|---|
| `id` | `id` | string, required |
| `code` | `code` | nullable/optional in schema |
| `name` | `name` | required |
| `city` | `city` | |
| `phone` | `phone` | |
| `type` | `type` | raw backend value, not translated |
| `status` | `status` | raw lifecycle name |
| `documentCount` | `documentCount` | default 0 — **always 0 from this endpoint** |
| `documentsComplete` | `documentsComplete` | default false — **always true from this endpoint** |
| `missingRequiredDocuments` | `missingRequiredDocuments` | default [] |
| `meta.pagination.totalCount` | `totalCount` | via `unwrapPage` |

## Portal status

Hub: implemented. Queue page: **mock** (M-05). Required backend change: GAP-03 (real document counts on these rows) so the queue can flag incomplete registrations.
