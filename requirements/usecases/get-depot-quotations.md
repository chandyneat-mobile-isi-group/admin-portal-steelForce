# UC-17 — Get depot quotations

## Use Case Information

| | |
|---|---|
| **Name** | Get depot quotations |
| **Description** | Shows a depot's recent quotations on the **Quotations** tab of `/depots`. (The portal shows Quotations instead of Orders because no orders API exists.) |
| **Actor** | Portal user |
| **Roles** | quotations read permission — `TODO - Permission confirmation required` (quotations feature, not analysed here) |
| **Trigger** | Opening the Quotations tab |

### Main flow

1. `DepotQuotations` sends `GET /api/v1/quotations?customerId={depotId}&page=1&pageSize=20`.
2. Rows are listed with number, status, amount and dates.

### Error flow

- Load error → inline error state.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/quotations` |
| **Query sent** | `customerId` (GUID), `page=1`, `pageSize=20` |

**Mismatch:** the backend's shared paging uses `pageNumber`, not `page` (README §16). `TODO - Backend Confirmation Required`: confirm the quotations endpoint's paging parameter and its response field names.

## Backend → Web Portal Mapping

Portal local type `QuotationSummary` (`src/features/depots/components/depot-quotations.tsx`):

| Portal field | Type | Backend field |
|---|---|---|
| `id` | string | `TODO - Backend Confirmation Required` |
| `quotationNumber?` | string | `TODO` — the approvals feature reads the same resource as `number` |
| `status?` | string | `TODO` |
| `totalAmount?` | number | `TODO` — the approvals feature reads `net` |
| `currency?` | string | `TODO` |
| `createdAt?` | string | `TODO` |
| `validUntil?` | string | `TODO` — the approvals feature reads `validTo` |

The two portal features disagree on quotation field names (`quotationNumber`/`number`, `totalAmount`/`net`, `validUntil`/`validTo`). Resolve against the quotations contract.

## Portal status

Implemented; field names unverified. Out of the Depots scope except for this tab.
