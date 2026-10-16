# UC-13 — Synchronise depots with SAP

## Use Case Information

| | |
|---|---|
| **Name** | Synchronise depots with SAP |
| **Description** | Shows how far the depot master and SAP have drifted apart, and runs the four SAP operations: pull master data, pull reference catalogues, push queued registrations, retry rejected registrations. |
| **Actor** | SAP operator |
| **Roles** | `customers.sync` — Administrator, Head of Sales, Sales Manager, Finance |
| **Preconditions** | Signed in with `customers.sync` (the panel renders nothing otherwise) |
| **Trigger** | `SapSyncPanel` on `/depots` (`src/features/depots/components/sap-sync-panel.tsx`) |

### Main flow

1. The panel loads `GET /api/v1/customers/sap/status` and shows the counts and timestamps.
2. The operator chooses an action:
   - **Pull from SAP** → `POST /api/v1/customers/sync-sap` → toast "Pull from SAP started."
   - **Refresh references** → `POST /api/v1/customers/sap/sync-references` → toast "Reference data refreshed."
   - **Push to SAP** → confirmation modal (it creates ERP records and names the count) → `POST /api/v1/customers/sap/push-pending` → toast "Push to SAP started."
   - **Retry rejected** → `POST /api/v1/customers/sap/retry-rejected` with `{ "customerIds": [] }` → toast "{n} re-queued."
3. The panel re-reads the status.

### Alternative flows

- **A1 — Retry specific depots:** `customerIds` lists GUIDs; an empty list means all rejected depots.
- **A2 — Dry run:** `push-pending?commit=false` simulates in SAP (SAP rolls back). Not used by the portal.

### Error flow

- **403** without `customers.sync`.
- **502 `Sap.*`** on `sync-references` when SAP is unavailable.
- Any failure → `toast.error(error.message)` or "SAP synchronisation failed."

### Business rules

- BR-12: SAP create is not idempotent; `Syncing` guards against duplicates.
- Retry changes status only (`Rejected` → `Submitted`); it **does not call SAP**. The next push (manual or the 15-minute job) sends them.
- Scheduled jobs also run: `sap-customer-registration-push` every 15 minutes (≤100 customers), `sap-customer-sync` at 02:00 UTC, `sap-customer-reference-sync` at 01:00 UTC.

## API

| ID | Method | Endpoint | Query | Body | Response |
|---|---|---|---|---|---|
| API-15 | GET | `/api/v1/customers/sap/status` | — | — | `200 SapSyncStatusDto` |
| API-16 | POST | `/api/v1/customers/sync-sap` | — | — | `204` (long-running; returns before completion) |
| API-17 | POST | `/api/v1/customers/sap/sync-references` | — | — | `200 CustomerReferenceSyncSummaryResponse` · `502` |
| API-18 | POST | `/api/v1/customers/sap/push-pending` | `commit` bool (true), `maxCustomers` int (100) | — | `200 SapPushSummaryDto` |
| API-19 | POST | `/api/v1/customers/sap/retry-rejected` | — | `{ "customerIds": GUID[] }` (optional) | `200 SapPushSummaryDto` |

All require `customers.sync`. Code: `CustomerSapController.cs:66-243`, `CustomersController.cs:260`.

Related, not used by the portal: `GET /customers/sap/rejected` (`page`, `pageSize`; plain array, no pagination meta), `POST /customers/sap/{id}/submit`, `POST /customers/sap/{id}/register?commit=`, `PUT /customers/sap/{id}?commit=`.

### Response — `SapSyncStatusDto`

```json
{
  "data": {
    "total": 6042,
    "registered": 5980,
    "pending": 12,
    "rejected": 4,
    "notSubmitted": 46,
    "lastRegisteredAt": "2026-09-25T02:15:00Z",
    "oldestPendingAt": "2026-09-22T08:00:00Z"
  }
}
```

| Field | Type | Nullable |
|---|---|---|
| `total`, `registered`, `pending`, `rejected`, `notSubmitted` | int | no |
| `lastRegisteredAt`, `oldestPendingAt` | ISO datetime | yes |

There is no `syncing` count, so depots stuck in `Syncing` are not visible in the panel (README Q8).

### Response — `SapPushSummaryDto`

```json
{
  "data": {
    "pending": 12,
    "registered": 10,
    "rejected": 2,
    "results": [],
    "completedAt": "2026-09-25T03:50:00Z"
  }
}
```

`TODO - Backend Confirmation Required`: the item shape of `results[]` (expected to be `CustomerSapStatusDto`, see UC-08).

## Backend → Web Portal Mapping

| Backend | Portal (`SapSyncStatus`, `src/features/depots/repositories/types.ts`) | Match |
|---|---|---|
| `total` | `total` | ✓ |
| `registered` | `registered` | ✓ |
| `pending` | `pending` | ✓ |
| `rejected` | `rejected` | ✓ |
| `notSubmitted` | `notSubmitted` | ✓ |
| `lastRegisteredAt` | `lastRegisteredAt: string \| null` | ✓ |
| `oldestPendingAt` | `oldestPendingAt: string \| null` | ✓ |

Push, pull, references and retry return `Promise<void>` in the portal; the summaries are ignored and the status is re-read.

## Portal status

Implemented.
