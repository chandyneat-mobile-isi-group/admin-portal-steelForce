# UC-12 — Get depot by code

## Use Case Information

| | |
|---|---|
| **Name** | Get depot by code |
| **Description** | Resolves a trading code to a depot — including an old `BP-…` code that SAP has since replaced, or a SAP number the platform has not stored yet. |
| **Actor** | Portal user |
| **Roles** | `customers.read` |
| **Trigger** | *No portal caller today.* `depotsRepository.getByCode()` exists. |

### Main flow

1. `GET /api/v1/customers/by-code/{customerCode}`.
2. The backend matches `code`, the SAP number, or `previousCode`.
3. If not found locally, it reads through to SAP (`GetCustDetail`) and stores the result.
4. Returns `200 CustomerResponse`.

### Error flow

- **404 `Customer.NotFoundByCode`** · **502 `Sap.*`** (SAP read-through failed) · **403**.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/customers/by-code/{customerCode}` |
| **Authorization** | `customers.read` |
| **Path** | `customerCode` — string, URL-encoded by the portal |
| **Response** | `200 CustomerResponse` (see [UC-03](get-depot-detail.md)) |
| **Code** | `CustomersController.cs:245` |

```http
GET /api/v1/customers/by-code/BP-202609-00012
```

### HTTP status codes

`200` · `401` · `403` · `404` · `502`

## Backend → Web Portal Mapping

`mapCustomerToDepot()` → `Depot`, as UC-03.

## Portal status

Unused. Useful after approval, when a screen still holds the old `BP-…` code (BR-04).
