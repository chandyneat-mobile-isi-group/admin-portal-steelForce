# UC-09 — Reject depot

## Use Case Information

| | |
|---|---|
| **Name** | Reject depot |
| **Description** | Refuses a registration with a reason that is stored on the record. |
| **Actor** | Approver |
| **Roles** | `customers.approve` (same holders as UC-08) |
| **Preconditions** | Status is `Draft`, `PendingApproval`, `RegionManagerApproved` or `SalesManagerApproved` |
| **Trigger** | **Reject** on `/depots` (opens a modal) or on `/approval/depots/{id}` (inline textarea) |

### Main flow

1. The approver presses **Reject** and types a reason.
2. The portal enables the confirm button only when `reason.trim().length >= 3` (counter shows `n/512`).
3. The portal calls `POST /api/v1/admin/depots/{depotId}/reject` with `{ "reason": "…" }`.
4. The backend (`RejectDepotCommand` → `CustomerApprovalService`) sets `Rejected`, stores `RejectionReason`, `RejectedBy`, `RejectedAt`, and writes an `approval_records` row with stage `Rejection`.
5. The backend returns `200 CustomerApprovalResponse`.
6. The portal invalidates the depot and queue queries and re-reads.

### Alternative flows

- **A1 — Decision page with a mid-chain depot:** the Reject button is hidden because the page shows actions only for `PendingApproval` (M-07), although the backend would accept it.

### Error flow

- **400** reason missing / shorter than 3 / longer than 512 (`errors.reason`, or `Customer.RejectionReasonRequired`).
- **422 `Customer.NotRejectable`** — depot is `Active`, `Suspended`, `Rejected` or `Closed`.
- **404** · **403**.

### Business rules

- BR-05, BR-06.
- The portal modal says "The reason is stored on the record and is what the representative who captured this shop will see." The reason is stored, but **no portal or admin API returns it** (M-10, GAP-02). Mobile can read it through `/mobile/depots/{id}/approval-history`.
- The portal comment says this action is guarded by `approvals.region`; the admin route actually requires **`customers.approve`** (M-09).

## API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/admin/depots/{depotId}/reject` |
| **Authorization** | `customers.approve` |
| **Path** | `depotId` — GUID |
| **Code** | `AdminDepotsController.cs:271`, `RejectDepotCommand.cs:40-48` |

### Request body (`RejectApprovalRequest`)

```json
{ "reason": "Storefront photo does not match the registered address. Please retake on site." }
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | yes | trimmed, 3–512 characters |

### Response — 200 (`CustomerApprovalResponse`)

```json
{
  "data": {
    "id": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
    "code": "BP-202609-00012",
    "status": "Rejected",
    "stage": "Rejection",
    "actedBy": "9d3c2b1a-7e6f-4a5b-8c9d-0e1f2a3b4c5d",
    "actedAt": "2026-09-25T03:45:00Z",
    "sapStatus": "NotSubmitted",
    "reason": "Storefront photo does not match the registered address. Please retake on site."
  },
  "meta": { "correlationId": "0HN6S2Q4B7K1M:0000000A", "timestamp": "2026-09-25T03:45:00Z" }
}
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | GUID | no | depot id |
| `code` | string | no | |
| `status` | string | no | `Rejected` |
| `stage` | string | no | `RegionManager` \| `SalesManager` \| `HeadOfSales` \| `Rejection` |
| `actedBy` | GUID | no | user id |
| `actedAt` | ISO datetime | no | |
| `sapStatus` | string | no | SAP registration status |
| `reason` | string | yes | |

### Error example — 422

```json
{
  "type": "https://docs.isigroup.com.kh/errors/Customer.NotRejectable",
  "title": "The request could not be completed.",
  "status": 422,
  "detail": "Only a customer still in the approval chain can be rejected.",
  "instance": "/api/v1/admin/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/reject",
  "errorCode": "Customer.NotRejectable",
  "correlationId": "0HN6S2Q4B7K1M:0000000B"
}
```

`errorCode` and `detail` are from `CustomerErrors.cs:140-142`.

### HTTP status codes

`200` · `400` · `401` · `403` · `404` · `422`

## Backend → Web Portal Mapping

The portal ignores the body (`reject(): Promise<void>`) and re-reads UC-03.

| After re-read | Portal | UI |
|---|---|---|
| `status: "Rejected"` | `DepotDetailDto.status` / `Depot.lifecycle` | chip "Rejected"; decision card "Already rejected." |
| `status: "Rejected"` | `Depot.status` (CRM) | **"Prospect"** (M-14) |
| reason | — | **not available** (GAP-02) |

## Status transitions

| Before | After |
|---|---|
| `Draft`, `PendingApproval`, `RegionManagerApproved`, `SalesManagerApproved` | `Rejected` |
| `Active`, `Suspended`, `Rejected`, `Closed` | 422 |

## Portal status

Implemented. Mismatches M-07, M-09, M-10, M-14.
