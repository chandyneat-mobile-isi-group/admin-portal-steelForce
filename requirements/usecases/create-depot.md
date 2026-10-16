# UC-05 — Create depot

## Use Case Information

| | |
|---|---|
| **Name** | Create depot |
| **Description** | Registers a new trading account from the portal. |
| **Actor** | Back-office user |
| **Roles** | `customers.create` (Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Sales Rep Regional, Supervisor, Sales Representative). Portal route `/depots/new` requires `customers.manage`. |
| **Preconditions** | Signed in with `customers.create` |
| **Trigger** | Completing the 5-step New Depot form and pressing **Create** (or **Create and add another**) |

### Main flow (required)

1. The user fills the steps *Identity → Contact → Address → Commercial → Assignment*.
2. The portal validates every step (see Validation).
3. The portal calls `depotsRepository.create(input)` → `POST /api/v1/customers` with `mapDepotToCustomerPayload(input)`.
4. The backend creates the depot in status **`Draft`** (`Customer.Register`, `Customer.cs:111`) and returns `201` with the full `CustomerResponse` and a `Location` header. It must then be submitted (UC-07) to reach the approval queue.
5. The portal navigates to `/depots/my` (or resets the form for "add another").

### Current implementation (differs)

`src/app/(portal)/depots/new/page.tsx` **never calls the API**. After validation it shows the toast "Depot created" and navigates away; **Save draft** only shows "Draft saved". Sales representatives in the Assignment step come from **demo data** (`salesReps` from `@/features/planning`). See M-01.

### Alternative flows

- **A1 — Create and add another:** keeps province, rep and territory, clears the rest.
- **A2 — Save draft:** no backend equivalent for the admin path (mobile has `/mobile/depots/draft`). `TODO - Backend Confirmation Required`.

### Error flow

- **E1 — 400 validation** (`errors` per field): show field errors. Today 400 is classified as `unknown` by the portal (M-19).
- **E2 — 409 `Customer.DuplicateCode`.**
- **E3 — 403** without `customers.create`.

### Business rules

- BR-10: `assignedSalesRepId` defaults to the caller when omitted and cannot be changed later.
- A depot created here has **no business-partner block**, so approving it later ends in `sapStatus: Rejected` (not ready for SAP). README Q7.

## API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/customers` |
| **Authentication** | Bearer |
| **Authorization** | `customers.create` |
| **Code** | `CustomersController.cs:102`, `CreateCustomerCommand.cs:27-150` |

### Request body (`CreateCustomerRequest`)

```json
{
  "code": "PPCS-0001",
  "name": "Phnom Penh Central Steel",
  "type": "Retailer",
  "phone": "+85511222333",
  "contactPerson": "Sok Dara",
  "email": "purchasing@ppcsteel.com.kh",
  "creditLimit": 20000,
  "creditTermDays": 30,
  "assignedSalesRepId": "0f8b1c55-3d7e-4f21-9c0a-6b2e7d1a4c33",
  "nameEn": "Phnom Penh Central Steel",
  "nameKm": "ភ្នំពេញ សេនត្រាល់ ស្ទីល",
  "descriptionEn": "Rebar and roofing retailer near Olympic Market",
  "address": {
    "line1": "#42, St. 271",
    "line2": null,
    "city": "Phnom Penh",
    "province": "Phnom Penh",
    "district": "Chamkar Mon",
    "postalCode": "12302",
    "latitude": 11.5432,
    "longitude": 104.9187
  }
}
```

| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `code` | string | **yes** | — | 2–32, `^[A-Za-z0-9-]+$`, upper-cased, unique (409) |
| `name` | string | **yes** | — | 2–256 |
| `type` | string | **yes** | — | `Retailer` \| `Wholesaler` \| `Distributor` \| `KeyAccount` (case-insensitive) |
| `phone` | string | **yes** | — | ≤32; 8–16 digits, optional leading `+` |
| `address` | object | **yes** | — | see below |
| `contactPerson` | string | no | null | ≤128 |
| `email` | string | no | null | email, ≤256 |
| `creditLimit` | number | no | 0 | 0..1,000,000,000 |
| `creditTermDays` | int | no | 0 | 0..180 |
| `assignedSalesRepId` | GUID | no | caller | — |
| `nameEn`, `nameKm` | string | no | null | ≤256 |
| `descriptionEn`, `descriptionKm` | string | no | null | ≤1024 |
| `address.line1` | string | **yes** | — | ≤256 |
| `address.city` | string | **yes** | — | ≤128 |
| `address.line2` | string | no | null | ≤256 |
| `address.province` | string | no | null | ≤128 |
| `address.postalCode` | string | no | null | ≤32 |
| `address.latitude` / `longitude` | number | no | null | −90..90 / −180..180, both or neither |
| `address.district` | string | no | null | ≤128 — **accepted but dropped** (M-04) |
| `address.country` | string | no | null | exactly 2 chars — **dropped** |
| `address.region` | string | no | null | ≤8 — **dropped** |
| `address.houseNo` | string | no | null | ≤32 — **dropped** |

### What the portal would send today (`mapDepotToCustomerPayload`)

```json
{
  "name": "Phnom Penh Central Steel",
  "phone": "+855 11 222 333",
  "contactPerson": "Sok Dara",
  "email": "purchasing@ppcsteel.com.kh",
  "creditLimit": 20000,
  "address": {
    "line1": "#42, St. 271",
    "city": "Chamkar Mon",
    "province": "Phnom Penh",
    "district": "Chamkar Mon",
    "latitude": 11.5432,
    "longitude": 104.9187
  }
}
```

**Missing `code` and `type` → 400** (M-02). Other form fields (registration no., industry, category, website, job title, commune, postal code, revenue, payment terms, segment, preferred products, status) have no backend field (M-23). Spaces in the phone number: `TODO - Backend Confirmation Required` whether the 8–16 digit rule strips separators.

### Response — 201

`CustomerResponse` (same shape as [UC-03](get-depot-detail.md#response--200-customerresponse)) plus `Location: /api/v1/customers/{id}`.

### HTTP status codes

`201` · `400` · `401` · `403` · `409 Customer.DuplicateCode`

## Backend → Web Portal Mapping

Response mapped with `mapCustomerToDepot()` → `Depot` (README §12). Form → request mapping:

| Portal form field | Request field | Note |
|---|---|---|
| `type` (`CUSTOMER_TYPES`) | `type` | **not sent**; vocabulary differs (M-03) |
| `name` | `name` | |
| `code` ("Depot ID", optional in form) | `code` | **not sent**; backend requires it |
| `contactPerson` | `contactPerson` | form requires it, backend optional |
| `phone` | `phone` | |
| `email` | `email` | |
| `street` | `address.line1` | via `input.address` |
| `district` / `province` | `address.city` | `city = district ‖ province` |
| `province` | `address.province` | |
| `district` | `address.district` | dropped by backend |
| `gps` ("lat, lng" text) | `address.latitude/longitude` | `TODO` — the form stores free text; parsing is not implemented |
| `postalCode` | — | **not sent** although the backend accepts it |
| `creditLimit` | `creditLimit` | form value is a string; must be converted to a number |
| `repId` | `assignedSalesRepId` | **not sent**; the options are demo reps |

## Portal status

**Not wired** (M-01). Backend work: M-04, README Q6 (code generation) and Q7 (SAP readiness).
