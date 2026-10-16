# UC-14 — Link depot to an existing SAP customer

## Use Case Information

| | |
|---|---|
| **Name** | Link depot to an existing SAP customer |
| **Description** | Repairs a depot that exists in SAP but is not linked locally — for example after a push timed out and left it in `Syncing`, or when SAP already had the customer. |
| **Actor** | SAP operator |
| **Roles** | `customers.sync` |
| **Preconditions** | The depot is not yet registered; the SAP number exists in SAP and is not linked to another depot |
| **Trigger** | *No portal screen.* Backend only. |

### Main flow

1. The operator enters the SAP customer number.
2. `POST /api/v1/admin/depots/{depotId}/link-sap` with `{ "sapCustomerNumber": "…" }`.
3. The backend verifies the number with SAP `GetCustDetail`, then calls `MarkRegisteredInSap`: `code` = SAP number, `previousCode` = old code, `sapStatus = Registered`.
4. Returns `200 CustomerSapStatusDto`.

### Error flow

- **409 `Customer.AlreadyRegisteredInSap`** · **409 `Customer.SapNumberAlreadyLinked`** · **404 `Customer.SapCustomerNotFound`** (not in SAP) · **404** depot · **502/500** SAP down.

## API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/admin/depots/{depotId}/link-sap` |
| **Authorization** | `customers.sync` |
| **Code** | `AdminDepotsController.cs:236`, `LinkCustomerToSapCommand.cs:46-135` (untracked file in the backend working tree) |

```json
{ "sapCustomerNumber": "6100006271" }
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `sapCustomerNumber` | string | yes | ≤10 characters |

Response: `CustomerSapStatusDto` (see [UC-08](approve-depot.md)).

### HTTP status codes

`200` · `400` · `401` · `403` · `404` · `409` · `500` · `502`

## Backend → Web Portal Mapping

No portal type yet. It would reuse the approve flow: ignore the body, re-read UC-03.

## Portal status

Not in the portal. `TODO - Backend Confirmation Required` (README Q8): should the SAP panel offer this for depots stuck in `Syncing`?
