# UC-03 — Get depot detail

## Use Case Information

| | |
|---|---|
| **Name** | Get depot detail |
| **Description** | Returns the full depot record: identity, address, credit terms, contacts, documents, SAP profile, business-partner block and SAP registration state. |
| **Actor** | Portal user |
| **Roles** | `customers.read`. Without `customers.readall` only depots assigned to the caller are visible. |
| **Preconditions** | Signed in; the depot id is a GUID |
| **Trigger** | Selecting a row on `/depots` or `/depots/my`; opening `/approval/depots/{id}`; re-read after approve/reject |

### Main flow

1. **Depots page:** `depotsRepository.getById(id)` → `GET /api/v1/customers/{id}` → `mapCustomerToDepot()`; the result is merged over the list row (`{ ...row, ...detail }`).
2. **Decision page:** `useDepotApproval(id)` → `approvalsApi.depotDetail(id)` → `DepotDetailSchema.parse(unwrapData(body))`, `staleTime: 0` (always fresh, because approval can change `code`).

### Alternative flows

- **A1 — Depot not visible or not found:** the backend answers 404 for both (BR-08). The repository returns `null`; the decision page shows "This registration could not be loaded."

### Error flow

- **E1 — 404** as above. **E2 — 403** (no `customers.read`). **E3 — network/5xx:** decision page error card; Depots page keeps the list row.
- **E4 — Zod parse failure** on the decision page (unexpected shape) is reported as a load error.

### Business rules

- BR-08: not visible = 404.
- `canTrade` is `true` only when `status == Active`.
- `code` may change after approval (BR-04); `previousCode` keeps the old one.

## API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/customers/{customerId}` (also mapped at `/api/v1/admin/customers/{customerId}`) |
| **Authentication** | Bearer |
| **Authorization** | `customers.read` |
| **Path** | `customerId` — GUID |
| **Code** | `CustomersController.cs:84`, `GetCustomerByIdQuery.cs:40-155` |

### Request example

```http
GET /api/v1/customers/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10
Authorization: Bearer eyJhbGciOi...
```

### Response — 200 (`CustomerResponse`)

```json
{
  "data": {
    "id": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
    "code": "BP-202609-00012",
    "previousCode": null,
    "name": "Phnom Penh Central Steel",
    "description": "Rebar and roofing retailer near Olympic Market",
    "type": "Retailer",
    "status": "PendingApproval",
    "canTrade": false,
    "phone": "+85511222333",
    "contactPerson": "Sok Dara",
    "email": "purchasing@ppcsteel.com.kh",
    "telegramUsername": "ppcsteel",
    "creditLimit": 20000,
    "creditTermDays": 30,
    "creditLimitDate": null,
    "assignedSalesRepId": "0f8b1c55-3d7e-4f21-9c0a-6b2e7d1a4c33",
    "approvedAt": null,
    "createdAt": "2026-09-17T04:20:00Z",
    "address": {
      "line1": "#42, St. 271",
      "line2": null,
      "city": "Phnom Penh",
      "district": "Chamkar Mon",
      "province": "Phnom Penh",
      "postalCode": "12302",
      "country": "KH",
      "region": null,
      "houseNo": "42",
      "cityCode": null,
      "latitude": 11.5432,
      "longitude": 104.9187
    },
    "contacts": [
      { "id": "a1d0c3e2-0b6f-4f0e-9e21-3b8c2f5d7e90", "name": "Sok Dara", "phone": "+85511222333", "position": "Owner", "email": null, "isPrimary": true }
    ],
    "documents": [
      {
        "id": "7e2f4b10-9c3a-4d8e-b1a2-5f6c7d8e9f01",
        "type": "STOREFRONT",
        "typeDisplay": "Storefront",
        "fileName": "storefront.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 482113,
        "url": "/api/v1/mobile/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/documents/7e2f4b10-9c3a-4d8e-b1a2-5f6c7d8e9f01/content",
        "publicUrl": null,
        "isPubliclyVisible": true,
        "capturedAt": "2026-09-17T04:10:00Z",
        "uploadedAt": "2026-09-17T04:12:00Z"
      }
    ],
    "missingRequiredDocuments": ["INSIDE_STORE", "ID_CARD"],
    "documentsComplete": false,
    "sap": {
      "sapCustomerId": null,
      "salesOrg": "0001",
      "distributionChannel": "10",
      "division": "10",
      "customerGroup": "01",
      "priceGroup": "11",
      "paymentTerms": "T014",
      "taxNumber": null,
      "salesOffice": "0001",
      "salesGroup": "010",
      "shippingCondition": "01",
      "creditControlArea": "0001",
      "isLinkedToSap": false,
      "isBlockedInSap": false,
      "hasCompleteSalesArea": true
    },
    "businessPartner": {
      "partnerCategory": "2",
      "partnerGroup": "Z001",
      "bpRole": "ZFLCU1",
      "accountGroup": "Z001",
      "partnerFunction": "VE",
      "personnelNumber": "0000100001",
      "searchTerm1": "PHNOM PENH",
      "searchTerm2": "BP-202609-00012",
      "language": "E",
      "telephone": "023456789",
      "mobilePhone": "+85511222333",
      "taxCountry": "KH",
      "taxType": "MWST",
      "taxClass": "0",
      "isReadyForSapCreate": true
    },
    "sapRegistration": {
      "status": "NotSubmitted",
      "submittedAt": null,
      "registeredAt": null,
      "lastError": null,
      "attemptCount": 0,
      "isReadyToRegister": true
    }
  },
  "meta": { "correlationId": "0HN6S2Q4B7K1M:00000004", "timestamp": "2026-09-25T03:31:00Z" }
}
```

The `sap` and `businessPartner` values follow the backend's real SAP sample (`backend-server/docs/requirement/customers/sap-createcust-sample.json`); the full field lists are below. The `documents[].url` route shown is `TODO - Backend Confirmation Required` (the DTO carries a `url`; its exact path was not verified).

### Response fields

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | GUID | no | |
| `code` | string | no | current trading code |
| `previousCode` | string | yes | code before SAP registration |
| `name` | string | no | |
| `description` | string | yes | |
| `type` | string | no | `CustomerType` name |
| `status` | string | no | `CustomerStatus` name |
| `canTrade` | bool | no | `status == Active` |
| `phone` | string | no | |
| `contactPerson`, `email`, `telegramUsername` | string | yes | |
| `creditLimit` | number | no | |
| `creditTermDays` | int | no | |
| `creditLimitDate` | string (date) | yes | |
| `assignedSalesRepId` | GUID | yes | owner |
| `approvedAt` | ISO datetime | yes | |
| `createdAt` | ISO datetime | no | |
| `address` | object | yes | `line1`, `line2?`, `city`, `district?`, `province?`, `postalCode?`, `country?`, `region?`, `houseNo?`, `cityCode?`, `latitude?`, `longitude?` |
| `contacts[]` | array | no | `id`, `name`, `phone?`, `position?`, `email?`, `isPrimary` |
| `documents[]` | array | no | `id`, `type`, `typeDisplay`, `fileName`, `contentType`, `sizeBytes`, `url`, `publicUrl?`, `isPubliclyVisible`, `capturedAt`, `uploadedAt` |
| `missingRequiredDocuments` | string[] | no | of `STOREFRONT`, `INSIDE_STORE`, `ID_CARD` |
| `documentsComplete` | bool | no | |
| `sap` | object | yes | `sapCustomerId`, `salesOrg`, `distributionChannel`, `division`, `customerGroup`, `priceGroup`, `paymentTerms`, `taxNumber`, `salesOffice`, `salesGroup`, `pricingProcedure`, `deliveryPriority`, `shippingCondition`, `creditControlArea`, `orderBlock`, `salesBlock`, `blockFlag` (all string?), `isLinkedToSap`, `isBlockedInSap`, `hasCompleteSalesArea` (bool) |
| `businessPartner` | object | yes | `partnerCategory`, `partnerGroup`, `bpRole`, `accountGroup`, `partnerFunction`, `partnerCounter`, `personnelNumber`, `searchTerm1`, `searchTerm2`, `name2`, `companyName`, `language`, `telephone`, `mobilePhone`, `taxCountry`, `taxType`, `taxClass` (string?), `isReadyForSapCreate` (bool) |
| `sapRegistration` | object | yes | `status` (`NotSubmitted`/`Submitted`/`Syncing`/`Registered`/`Rejected`), `submittedAt?`, `registeredAt?`, `lastError?`, `attemptCount`, `isReadyToRegister` |

**Not exposed** (needed by the portal, GAP-02): `rejectionReason`, `rejectedAt`, `rejectedBy`, `approvedBy`, `regionManagerApprovedBy/At`, `salesManagerApprovedBy/At`, `territory`.

### HTTP status codes

`200` · `401` · `403` · `404 Customer.NotFound`

## Backend → Web Portal Mapping

### A. Depots page — `Depot` via `mapCustomerToDepot()`

See [README §12](../README.md#12-web-portal-model-mapping) for the full table. Detail-only fields: `telegram`, `sapId`, `canTrade`, `latitude`, `longitude`, `addressLine1`, `addressLine2`, `postalCode`, `documents`, `missingRequiredDocuments`, `documentsComplete`, `creditTermDays`. **Not mapped** into `Depot`: `previousCode`, `contacts`, `sap` (except `sapCustomerId`), `businessPartner`, `sapRegistration`, `approvedAt`.

### B. Decision page — `DepotDetailDto` (Zod `DepotDetailSchema`)

| Backend | Portal | Match |
|---|---|---|
| all top-level scalars listed above | same names | ✓ |
| `address.*` | `DepotAddressSchema` | ✓ (`cityCode` not declared, ignored) |
| `contacts[].position` | `DepotContactSchema.role` | ✗ **name mismatch (M-15)** |
| `documents[]` | `DepotDocumentSchema` (`id,type,typeDisplay,fileName,contentType,sizeBytes,url,publicUrl,uploadedAt`) | ✓ (`capturedAt`, `isPubliclyVisible` ignored) |
| `sap.*` | `DepotSapSchema` | ✓ (subset) |
| `sapRegistration.*` | `DepotSapRegistrationSchema` | ✓ |
| `businessPartner.*` | `DepotBusinessPartnerSchema` | ✓ (subset) |

Dates stay ISO strings in both models and are formatted in the UI (`date-fns format`, `formatDate`).

## Portal status

Implemented. Backend requirement: GAP-02. Portal fix: M-15.
