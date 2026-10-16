# UC-08 — Approve depot

## Use Case Information

| | |
|---|---|
| **Name** | Approve depot |
| **Description** | Approves a pending registration, makes the depot `Active`, and registers it in SAP. On SAP success the depot's `code` becomes the SAP customer number. |
| **Actor** | Approver |
| **Roles** | `customers.approve` — Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance; also Sales Rep Regional and Sales Representative (`TODO - Permission confirmation required`, README §4.3) |
| **Preconditions** | Depot status is **`PendingApproval`** |
| **Trigger** | **Approve** on a card in `/depots` (visible for `AWAITING_DECISION` states when `can('customers.approve')`), or **Approve** on `/approval/depots/{id}` (visible only when `status === 'PendingApproval'`) |

### Main flow

1. The approver opens the depot and reviews identity, address, documents (UC-04) and the SAP block (UC-03).
2. The approver presses **Approve**.
3. The portal calls `POST /api/v1/admin/depots/{depotId}/approve` (no body).
4. The backend (`ApproveCustomerCommand`, `CustomerLifecycleCommands.cs:132-228`):
   1. `Customer.Approve()` — requires `PendingApproval`; sets `Active`, `ApprovedBy`, `ApprovedAt`; raises `CustomerApprovedDomainEvent` (no handlers).
   2. `Customer.SubmitToSap()` — `sapStatus = Submitted`.
   3. `SapRegistrar.RegisterAsync(commit: true)` — synchronous push to SAP (README §10).
   4. On SAP success: `code = <SAP number>`, `previousCode = <old BP-… code>`, `sapStatus = Registered`.
5. The backend returns `200 CustomerSapStatusDto`.
6. The portal shows a success toast (`/depots`) or calls `router.refresh()` (decision page), invalidates `approvalKeys.depot(id)` and `approvalKeys.depots()`, and re-reads the depot — the code it knew may no longer exist.

### Alternative flows

- **A1 — SAP rejects or depot not SAP-ready:** approval still succeeds (`status: Active`); response `sapStatus: "Rejected"` with `lastError`. The decision page shows `sapRegistration.lastError` in a red banner after the re-read.
- **A2 — SAP unreachable:** approval succeeds; `sapStatus` returns to `Submitted` and the 15-minute job retries.
- **A3 — SAP timeout / unknown API error:** approval succeeds; `sapStatus` stays `Syncing` for manual review (README Q8).

### Error flow

- **E1 — 422 `Customer.NotAwaitingApproval`:** the depot is not `PendingApproval` — including `RegionManagerApproved` and `SalesManagerApproved`, for which `/depots` still shows the button (M-06).
- **E2 — 404:** unknown or invisible depot.
- **E3 — 403:** missing `customers.approve`.
- Portal: `/depots` shows `toast.error(err.message)` (a message key, M-18); the decision page shows the message in a red box.

### Business rules

- BR-02, BR-03, BR-04 (README §14).
- **No document check** (BR-07): a depot with missing required documents can be approved.
- **No `approval_records` row** is written (the chain writes one). README Q4.
- **No notification** is sent. README Q5.

## API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/admin/depots/{depotId}/approve` |
| **Authentication** | Bearer |
| **Authorization** | `customers.approve` |
| **Path** | `depotId` — GUID |
| **Body** | none |
| **Code** | `AdminDepotsController.cs:198` |

Also reachable as `POST /api/v1/customers/{customerId}/approve` (same command).

### Request

```http
POST /api/v1/admin/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/approve
Authorization: Bearer eyJhbGciOi...
```

The prompt-style body `{ "remark": "Approved" }` is **not supported**: the endpoint takes no body and stores no remark.

### Response — 200 (`CustomerSapStatusDto`) — SAP success

```json
{
  "data": {
    "customerId": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
    "customerCode": "6100006271",
    "name": "Phnom Penh Central Steel",
    "sapStatus": "Registered",
    "sapCustomerNumber": "6100006271",
    "submittedAt": "2026-09-25T03:40:00Z",
    "registeredAt": "2026-09-25T03:40:02Z",
    "lastError": null,
    "attemptCount": 1,
    "sap": {
      "customerNumber": "6100006271",
      "committed": true,
      "messages": [
        { "type": "S", "id": "R11", "number": "311", "message": "Customer 6100006271 has been created" }
      ]
    }
  },
  "meta": { "correlationId": "0HN6S2Q4B7K1M:00000009", "timestamp": "2026-09-25T03:40:02Z" }
}
```

The SAP message text above is illustrative; `type`/`id`/`number`/`message` are the real field names.

### Response — 200 — SAP refused (approval kept)

```json
{
  "data": {
    "customerId": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
    "customerCode": "BP-202609-00012",
    "name": "Phnom Penh Central Steel",
    "sapStatus": "Rejected",
    "sapCustomerNumber": null,
    "submittedAt": "2026-09-25T03:40:00Z",
    "registeredAt": null,
    "lastError": "This customer is missing the account group, BP role, partner group or sales area that SAP requires.",
    "attemptCount": 0,
    "sap": null
  }
}
```

`lastError` is the message of `Customer.IncompleteForSapRegistration` (`CustomerErrors.cs:177-179`). `TODO - Backend Confirmation Required`: whether `lastError` stores this message verbatim.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `customerId` | GUID | no | depot id |
| `customerCode` | string | no | code **after** the push |
| `name` | string | no | |
| `sapStatus` | string | no | `NotSubmitted` \| `Submitted` \| `Syncing` \| `Registered` \| `Rejected` |
| `sapCustomerNumber` | string | yes | SAP KUNNR |
| `submittedAt`, `registeredAt` | ISO datetime | yes | |
| `lastError` | string | yes | ≤1024 chars |
| `attemptCount` | int | no | |
| `sap` | object | yes | `{ customerNumber?, committed, messages[{ type, id, number, message }] }` |

Note: the response carries **no depot `status`**; clients must re-read to see `Active`.

### HTTP status codes

`200` · `401` · `403` · `404` · `422 Customer.NotAwaitingApproval`

## Backend → Web Portal Mapping

The portal **ignores the response body** (`approve(): Promise<void>`; `approveDepot` returns `unknown`) and re-reads `GET /customers/{id}`:

| After re-read | Portal field (`DepotDetailDto`) | UI |
|---|---|---|
| `status: "Active"` | `status` | status chip; decision card "Already approved. No action left here." |
| `code` (SAP number) | `code` | header, copy button |
| `previousCode` (`BP-…`) | `previousCode` | detail field |
| `approvedAt` | `approvedAt` | "Approved" field |
| `sap.sapCustomerId` | `sap.sapCustomerId` | SAP block |
| `sapRegistration.status/lastError/attemptCount` | same | SAP registration block, error banner |

## Status transitions

| Before | Action | After | SAP |
|---|---|---|---|
| `PendingApproval` | approve | `Active` | `Registered` / `Rejected` / `Submitted` / `Syncing` |
| `RegionManagerApproved`, `SalesManagerApproved` | approve | **422** | — |
| any other | approve | **422** | — |

## Portal status

Implemented. Mismatches M-06, M-07, M-18. Backend decisions: README Q1 (chain from portal), Q3 (documents), Q4 (audit), Q5 (notifications).
