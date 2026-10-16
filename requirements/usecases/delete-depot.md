# UC-11 — Delete depot

## Use Case Information

| | |
|---|---|
| **Name** | Delete depot |
| **Description** | Soft-deletes a depot (sets `IsDeleted`, `DeletedAt`, `DeletedBy`). |
| **Actor** | Administrator |
| **Roles** | `customers.delete` — **Administrator only** among the seeded roles |
| **Preconditions** | Depot exists |
| **Trigger** | *No portal screen today.* `depotsRepository.delete()` exists with no caller. |

### Main flow

1. `DELETE /api/v1/customers/{customerId}`.
2. The backend soft-deletes and returns `204`.
3. The portal removes the depot from its lists (re-fetch).

### Error flow

- **404** · **403**.

### Business rules

- Soft delete only; data is kept.
- `TODO - Backend Confirmation Required`: whether deleting a depot already registered in SAP (`sapStatus: Registered`) or with open quotations/route stops should be refused. No such guard was found.

## API

| | |
|---|---|
| **Method** | `DELETE` |
| **Endpoint** | `/api/v1/customers/{customerId}` |
| **Authorization** | `customers.delete` |
| **Body** | none |
| **Response** | `204` |
| **Code** | `CustomersController.cs:219` |

### HTTP status codes

`204` · `401` · `403` · `404`

## Backend → Web Portal Mapping

None (no body). Repository signature `delete(id): Promise<void>` matches.

## Portal status

No UI.
