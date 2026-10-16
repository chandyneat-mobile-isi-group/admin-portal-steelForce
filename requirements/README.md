# Depots — Backend API Requirements (Web Portal)

**Scope:** the Depots feature of the SteelForce admin Web Portal (`admin-web-portal`, Next.js 13 App Router).
**Sources of truth:** the portal source under `src/` and the .NET backend in `../backend-server/src` (working tree as of 2026-09-25, branch `feature/testing-onprime`).
**Status of this document:** analysis of the *current* implementation. Nothing here is invented. Anything that could not be confirmed from source is marked `TODO - Backend Confirmation Required` or `TODO - Permission confirmation required`.

> Mobile behaviour is **out of scope** and is only mentioned where the portal depends on data that mobile creates (registrations, documents, the approval chain).

---

## Contents

1. [Feature overview](#1-feature-overview)
2. [Business purpose](#2-business-purpose)
3. [Web Portal roles](#3-web-portal-roles)
4. [Permissions](#4-permissions)
5. [User stories](#5-user-stories)
6. [Use cases](#6-use-cases)
7. [API list](#7-api-list)
8. [Depot lifecycle / status flow](#8-depot-lifecycle--status-flow)
9. [Approval workflow](#9-approval-workflow)
10. [SAP integration flow](#10-sap-integration-flow)
11. [Request / response contracts](#11-request--response-contracts)
12. [Web Portal model mapping](#12-web-portal-model-mapping)
13. [Validation rules](#13-validation-rules)
14. [Business rules](#14-business-rules)
15. [Error handling](#15-error-handling)
16. [Pagination, filtering, search](#16-pagination-filtering-search)
17. [Frontend ↔ backend mismatches](#17-frontend--backend-mismatches)
18. [Open questions](#18-open-questions)
19. [Backend implementation checklist](#19-backend-implementation-checklist)
20. [Traceability](#20-traceability)

---

## 1. Feature overview

"Depot" is the portal's word for what the backend calls a **Customer**: one trading account / business partner, stored in `steelforce_depots_information` (+ `sap_depots_information`). A **NON-BP depot** is a *prospect* (backend `NonCustomer`) that has no SAP business-partner number yet.

| Portal screen | Route | Data source today | Code |
|---|---|---|---|
| Depots (directory + detail panel) | `/depots` | **Real API** when `NEXT_PUBLIC_DEPOTS_API=true`, demo data otherwise | `src/app/(portal)/depots/page.tsx` |
| My Depots | `/depots/my` | Real API (`scope: 'assigned'`), filters are client-side | `src/app/(portal)/depots/my/page.tsx` |
| NON-BP Depots | `/depots/non-bp` | Real API, read-only | `src/app/(portal)/depots/non-bp/page.tsx` |
| New Depot (5-step form) | `/depots/new` | **Not wired — shows a success toast, calls nothing** | `src/app/(portal)/depots/new/page.tsx` |
| Depot Assignment (Excel import) | `/depots/assignments` | Real API | `src/app/(portal)/depots/assignments/page.tsx` |
| Approval hub (count card) | `/approval` | Real API (`/admin/depots/pending-approval`) | `src/app/(portal)/approval/page.tsx` |
| Depot approval queue | `/approval/depots` | **Hard-coded `MOCK_DEPOTS`, local state only** | `src/app/(portal)/approval/depots/page.tsx` |
| Depot approval decision | `/approval/depots/[id]` | Real API | `src/app/(portal)/approval/depots/[id]/page.tsx` |

Data-layer files: `src/features/depots/repositories/*` (repository, DTOs, mappers), `src/features/approvals/{api,hooks}.ts`, `src/features/depot-assignments/*`, components `sap-sync-panel.tsx`, `depot-documents.tsx`, `depot-quotations.tsx`, `depot-drawer.tsx`.

The repository is switched by the flag `NEXT_PUBLIC_DEPOTS_API` (`src/features/depots/repositories/index.ts`): `true` → `ApiDepotRepository`, otherwise `MockDepotRepository` (demo data). **Everything in this document assumes `true`.**

## 2. Business purpose

- Keep one authoritative directory of trading accounts (≈6,000 rows per portal comments) for back-office staff.
- Let managers **decide on new depot registrations** captured in the field (mostly from the mobile app), reviewing identity, address, documents and credit terms.
- **Register approved depots in SAP** as business partners, so that SAP's customer number becomes the depot's trading code.
- Keep the portal and SAP in step (pull master data, pull reference catalogues, push queued registrations, retry rejected ones).
- Show prospects (NON-BP depots) and plan depot visits for representatives (Excel import of route stops).

## 3. Web Portal roles

The portal **never checks role names**. It checks permissions from the access token's `isi:permission` claims (`src/domain/enums/auth.ts`, `src/lib/auth/authorization.ts`). Roles are administrator-owned data on the backend.

**Backend roles** (`ISI.Domain/Modules/Authorization/RoleCatalog.cs`), which are what real users hold:

| Role | Business meaning in the depot chain |
|---|---|
| Administrator | everything |
| Head of Sales | third (final) approval stage (`approvals.head`) |
| Sales Manager | second approval stage (`approvals.sales`) |
| Sales Rep Manager | second approval stage (`approvals.sales`) |
| Sales Rep Regional | first approval stage — "region manager" (`approvals.region`) |
| Supervisor | reads and edits depots, no approval |
| Sales Representative | captures depots (mobile) |
| Finance | reads, approves (admin), SAP sync |
| Warehouse | read only |
| Executive | read + audit |
| Human Resources | no depot access |

**Portal demo roles** (`src/lib/permissions/role-meta.ts`) — used only by the offline `static` auth mode, never against the real backend: `Admin`, `SalesRepManager`, `SalesAdmin`, `Finance`. "Sales Admin" **does not exist** as a backend role.

## 4. Permissions

### 4.1 Permission vocabulary

| Permission | Holder can… | Where enforced |
|---|---|---|
| `customers.read` | read a depot they may see (own depots unless `readall`) | backend |
| `customers.readall` | read every depot; required for `/admin/depots*` lists | backend |
| `customers.create` | create a depot | backend |
| `customers.update` | edit / submit a depot | backend |
| `customers.delete` | soft-delete a depot | backend |
| `customers.approve` | approve / reject (admin routes), suspend, reinstate | backend + portal buttons |
| `customers.audit` | read approval history (mobile route only) | backend |
| `customers.sync` | every SAP operation | backend + portal SAP panel |
| `approvals.region` / `.sales` / `.head` | the three chain stages (mobile routes only) | backend |
| `noncustomers.readall` | list all NON-BP depots | backend |
| `routes.manage` | depot-assignment import | backend + portal route |
| `customers.view` *(portal alias)* | added to the token when the user has `customers.read` **or** `customers.readall` | portal routes/menu |
| `customers.manage` *(portal alias)* | added when the user has any of `customers.create/update/approve/delete/sync` | portal routes/menu |

Aliases are issued by the backend (`PortalPermissionAliases.cs:44-49`).

### 4.2 Portal route guards (`src/config/permissions.ts`, `src/config/navigation.ts`)

| Route | Required permission |
|---|---|
| `/depots`, `/depots/my`, `/depots/non-bp` | `customers.view` |
| `/depots/new` | `customers.manage` |
| `/depots/assignments` | `routes.manage` |
| `/approval` | any authenticated user |
| `/approval/depots`, `/approval/depots/[id]` | `customers.manage` |

In-page gates: Approve/Reject buttons on `/depots` → `can('customers.approve')`; SAP panel → `can('customers.sync')`; the decision page `/approval/depots/[id]` has **no in-page permission gate** (relies on the route guard + backend 403).

### 4.3 Role × action matrix (effective, from backend grants)

✓ = backend grants the permission the endpoint requires. ✗ = backend returns 403. Portal screens do not always match — see §17.

| Role | View list (`readall`) | View detail (`read`) | Create | Edit | Submit | Approve (admin) | Reject (admin) | Suspend / Reinstate | Delete | SAP sync | NON-BP list | Assignment import |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Administrator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head of Sales | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Sales Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Sales Rep Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Sales Rep Regional | ✗ | ✓ (own) | ✓ | ✓ | ✓ | ✓ ⚠ | ✓ ⚠ | ✓ ⚠ | ✗ | ✗ | ✗ | ✓ |
| Supervisor | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Sales Representative | ✗ | ✓ (own) | ✓ | ✓ | ✓ | ✓ ⚠ | ✓ ⚠ | ✓ ⚠ | ✗ | ✗ | ✗ | ✗ |
| Finance | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Warehouse | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Executive | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Human Resources | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

⚠ **TODO - Permission confirmation required.** `Sales Representative` and `Sales Rep Regional` hold `customers.approve`. The admin approve endpoint (`POST /admin/depots/{id}/approve`) checks only that permission, so a representative could approve — and push to SAP — a depot, **skipping the three-stage chain**. Confirm whether `customers.approve` on those roles is intended.

## 5. User stories

See [user-stories/README.md](user-stories/README.md).

| ID | Story | Role(s) |
|---|---|---|
| US-01 | [View depots](user-stories/view-depots.md) | any role with `customers.readall` |
| US-02 | [View my depots](user-stories/view-my-depots.md) | any role with `customers.view` |
| US-03 | [View depot detail](user-stories/view-depot-detail.md) | `customers.read` |
| US-04 | [Review depot documents](user-stories/review-depot-documents.md) | `customers.read` |
| US-05 | [Create depot](user-stories/create-depot.md) | `customers.create` |
| US-06 | [Edit depot](user-stories/update-depot.md) | `customers.update` |
| US-07 | [Submit depot](user-stories/submit-depot.md) | `customers.update` |
| US-08 | [Review the approval queue](user-stories/view-approval-queue.md) | `customers.readall` |
| US-09 | [Approve depot](user-stories/approve-depot.md) | `customers.approve` |
| US-10 | [Reject depot](user-stories/reject-depot.md) | `customers.approve` |
| US-11 | [Suspend / reinstate depot](user-stories/suspend-reinstate-depot.md) | `customers.approve` |
| US-12 | [Synchronise depots with SAP](user-stories/sync-depots-with-sap.md) | `customers.sync` |
| US-13 | [View NON-BP depots](user-stories/view-non-bp-depots.md) | `noncustomers.readall` |
| US-14 | [Import depot assignments](user-stories/import-depot-assignments.md) | `routes.manage` |

## 6. Use cases

See [usecases/README.md](usecases/README.md). One file per use case, each with API, request, response and Backend → Web Portal mapping.

## 7. API list

"Portal usage" is what the code actually does today.

| ID | Method | Endpoint | Permission | Use case | Portal usage |
|---|---|---|---|---|---|
| API-01 | GET | `/api/v1/admin/depots` | `customers.readall` | [UC-01](usecases/get-depots.md) | **used** — Depots, My Depots |
| API-02 | GET | `/api/v1/admin/depots/pending-approval` | `customers.readall` | [UC-02](usecases/get-pending-depots.md) | **used** — approval hub count only |
| API-03 | GET | `/api/v1/customers/{customerId}` | `customers.read` | [UC-03](usecases/get-depot-detail.md) | **used** — detail panel, decision page |
| API-04 | GET | `/api/v1/admin/depots/{depotId}/documents` | `customers.read` | [UC-04](usecases/get-depot-documents.md) | **used** — Documents tab |
| API-05 | GET | `/api/v1/admin/depots/{depotId}/documents/{documentId}/content` | `customers.read` | [UC-04](usecases/get-depot-documents.md) | **used** — image/PDF bytes |
| API-06 | POST | `/api/v1/customers` | `customers.create` | [UC-05](usecases/create-depot.md) | declared in repository, **UI not wired** |
| API-07 | PUT | `/api/v1/customers/{customerId}` | `customers.update` | [UC-06](usecases/update-depot.md) | declared, **no UI** |
| API-08 | POST | `/api/v1/customers/{customerId}/submit` | `customers.update` | [UC-07](usecases/submit-depot.md) | declared, **no UI** |
| API-09 | POST | `/api/v1/admin/depots/{depotId}/approve` | `customers.approve` | [UC-08](usecases/approve-depot.md) | **used** |
| API-10 | POST | `/api/v1/admin/depots/{depotId}/reject` | `customers.approve` | [UC-09](usecases/reject-depot.md) | **used** |
| API-11 | POST | `/api/v1/customers/{customerId}/suspend` | `customers.approve` | [UC-10](usecases/suspend-reinstate-depot.md) | declared, **no UI** |
| API-12 | POST | `/api/v1/customers/{customerId}/reinstate` | `customers.approve` | [UC-10](usecases/suspend-reinstate-depot.md) | declared, **no UI** |
| API-13 | DELETE | `/api/v1/customers/{customerId}` | `customers.delete` | [UC-11](usecases/delete-depot.md) | declared, **no UI** |
| API-14 | GET | `/api/v1/customers/by-code/{customerCode}` | `customers.read` | [UC-12](usecases/get-depot-by-code.md) | declared, **unused** |
| API-15 | GET | `/api/v1/customers/sap/status` | `customers.sync` | [UC-13](usecases/sap-sync.md) | **used** — SAP panel |
| API-16 | POST | `/api/v1/customers/sync-sap` | `customers.sync` | [UC-13](usecases/sap-sync.md) | **used** |
| API-17 | POST | `/api/v1/customers/sap/sync-references` | `customers.sync` | [UC-13](usecases/sap-sync.md) | **used** |
| API-18 | POST | `/api/v1/customers/sap/push-pending` | `customers.sync` | [UC-13](usecases/sap-sync.md) | **used** |
| API-19 | POST | `/api/v1/customers/sap/retry-rejected` | `customers.sync` | [UC-13](usecases/sap-sync.md) | **used** |
| API-20 | POST | `/api/v1/admin/depots/{depotId}/link-sap` | `customers.sync` | [UC-14](usecases/link-depot-to-sap.md) | backend only, **no portal UI** |
| API-21 | GET | `/api/v1/admin/non-bp-depots` | `noncustomers.readall` | [UC-15](usecases/get-non-bp-depots.md) | **used** |
| API-22 | GET | `/api/v1/admin/depot-assignments/template` | `routes.manage` | [UC-16](usecases/import-depot-assignments.md) | **used** |
| API-23 | POST | `/api/v1/admin/depot-assignments/import` | `routes.manage` | [UC-16](usecases/import-depot-assignments.md) | **used** |
| API-24 | POST | `/api/v1/admin/depot-assignments/import/error-report` | `routes.manage` | [UC-16](usecases/import-depot-assignments.md) | **used** |
| API-25 | GET | `/api/v1/quotations?customerId=…` | *(quotations feature)* | [UC-17](usecases/get-depot-quotations.md) | **used** — Quotations tab |

**Required by portal behaviour but missing on the backend** (details in §17 and the use cases):

| ID | Need | Why |
|---|---|---|
| GAP-01 | Advance the three-stage chain from the portal | The portal offers Approve on `RegionManagerApproved` / `SalesManagerApproved`; the admin approve returns 422 for them |
| GAP-02 | Rejection reason + approval trail on the depot detail | Reject stores a reason "the representative will see", but `CustomerResponse` does not expose it; approval history exists only under `/mobile` |
| GAP-03 | Accurate document completeness on list rows | `/admin/depots*` rows always report `documentsComplete: true` |
| GAP-04 | Sales-rep names for `assignedSalesRepId` | the portal resolves names against demo data |
| GAP-05 | Assigned rep on list rows | `CustomerListItemResponse` has no `assignedSalesRepId` |

## 8. Depot lifecycle / status flow

Backend enum `CustomerStatus` (`CustomerId.cs:50`), serialised as the **name string**. The portal carries it as `Depot.lifecycle` (`DEPOT_LIFECYCLE` in `src/features/depots/repositories/types.ts`). The two lists are identical:

`Draft` · `PendingApproval` · `RegionManagerApproved` · `SalesManagerApproved` · `Active` · `Suspended` · `Rejected` · `Closed`

```text
                         submit (any status except Closed)
   ┌──────────────────────────────────────────────────────────────┐
   ▼                                                              │
 Draft ──submit──▶ PendingApproval ──region──▶ RegionManagerApproved ──sales──▶ SalesManagerApproved ──head──▶ Active
                        │   │                        │                               │                       │   ▲
                        │   └──── admin approve (single step, skips chain) ─────────────────────────────────▶│   │
                        │                            │                               │                   suspend reinstate
                        └─────────── reject ─────────┴───────────── reject ──────────┘                       ▼   │
                                        ▼                                                                 Suspended
                                    Rejected ──submit──▶ PendingApproval
 any ──close (no endpoint)──▶ Closed
```

| Transition | From → To | Portal trigger | API |
|---|---|---|---|
| Submit | any except `Closed` → `PendingApproval` | none today | API-08 |
| Admin approve | `PendingApproval` → `Active` (+ SAP push) | Approve button | API-09 |
| Region approve | `PendingApproval` → `RegionManagerApproved` | none (mobile only) | `/mobile/depots/{id}/region-manager/approve` |
| Sales approve | `RegionManagerApproved` → `SalesManagerApproved` | none (mobile only) | `/mobile/depots/{id}/sales-manager/approve` |
| Head approve | `SalesManagerApproved` → `Active` (+ SAP queue) | none (mobile only) | `/mobile/depots/{id}/head-of-sales/approve` |
| Reject | `Draft`, `PendingApproval`, `RegionManagerApproved`, `SalesManagerApproved` → `Rejected` | Reject button | API-10 |
| Suspend | `Active` → `Suspended` | none today | API-11 |
| Reinstate | `Suspended` → `Active` | none today | API-12 |
| Close | any → `Closed` | none | *no endpoint* |

The portal also derives a lossy CRM status (`Depot.status`: `Active`, `Prospect`, `Needs Follow-up`, `At Risk`, `Inactive`) — see §12.

**SAP registration status** (separate field, `SapRegistrationStatus.cs:22`): `NotSubmitted` · `Submitted` · `Syncing` · `Registered` · `Rejected`. Exposed as `sapRegistration.status` on the detail and `sapStatus` on approve responses.

**NON-BP status** (`NonCustomerStatus`): `Pending` · `Approved` · `Rejected` · `Converted` (`Converted` is never set — no conversion flow exists).

## 9. Approval workflow

Two parallel mechanisms exist on the backend. The portal uses only the first.

**A. Admin single-step approval** (portal: `/depots` and `/approval/depots/[id]`)

```text
Approver (customers.approve)
  → POST /api/v1/admin/depots/{depotId}/approve         (no body)
  → ApproveCustomerCommand
      1. Customer.Approve(): requires status PendingApproval, sets Active, ApprovedBy/At
      2. Customer.SubmitToSap(): sapStatus → Submitted
      3. SapRegistrar.RegisterAsync(commit: true): synchronous push to SAP
  ← 200 CustomerSapStatusDto  (approval succeeds even if SAP fails; see sapStatus)
  → Portal invalidates the queries and re-reads the depot (code may have changed)
```

- Writes **no** `approval_records` row (the chain does).
- Does **not** check required documents.
- Sends **no** notifications (no domain-event handlers exist).

**B. Three-stage chain** (mobile only today): `approvals.region` → `approvals.sales` → `approvals.head`. Each stage writes an `approval_records` row. The final stage sets `Active` and **queues** SAP (`Submitted`); the Hangfire job `sap-customer-registration-push` (every 15 minutes, up to 100 customers) delivers it.

**Reject** (`POST /admin/depots/{id}/reject`, `{ "reason": "…" }` 3–512 chars) is allowed at any pre-active stage and writes an `approval_records` row with stage `Rejection`. The reason is stored (`RejectionReason`) but **not returned** by `GET /customers/{id}`.

There is **no "request changes / return for edit"** action. A rejected depot can be re-submitted (`submit` accepts any status except `Closed`).

## 10. SAP integration flow

```text
Portal Approve
  → POST /api/v1/admin/depots/{depotId}/approve
  → ApproveCustomerCommand → SapRegistrar.RegisterAsync(commit: true)
      a. already linked to SAP?               → refused (Customer.AlreadyRegisteredInSap)
      b. IsReadyToRegisterInSap?              no → sapStatus Rejected (IncompleteForSapRegistration), SAP not called
           (name, BP AccountGroup, BpRole, PartnerGroup, SalesOrg, DistributionChannel, Division)
      c. BeginSapRegistration                 → sapStatus Syncing, attemptCount + 1
      d. POST {SAP}/api/Customer/CreateCust/{conId}   (SapBpWriteRequest, PascalCase, nulls omitted)
      e. SAP response
           messages type E/A                  → sapStatus Rejected, sapLastError (≤1024 chars)
           no customer number                 → sapStatus Rejected
           customer number (KUNNR)            → MarkRegisteredInSap:
                                                  sap.sapCustomerId = KUNNR
                                                  code              = KUNNR
                                                  previousCode      = old "BP-YYYYMM-NNNNN"
                                                  sapStatus         = Registered, sapRegisteredAt = now
           transport error (connection/login/all endpoints) → back to Submitted (re-sent by the job)
           other failure (timeout, Sap.ApiError)            → stays Syncing — manual review, never re-sent
  ← 200 CustomerSapStatusDto
  → Portal re-reads GET /customers/{id}; shows code, previousCode, sapRegistration.lastError
```

| Question | Answer from source |
|---|---|
| Which API does the portal call? | `POST /api/v1/admin/depots/{depotId}/approve` (and the SAP panel endpoints API-15..19) |
| Which service calls SAP? | `ISI.Infrastructure/Services/SapCustomerService.cs` via `SapRegistrar.RegisterAsync` (`SapRegistrationCommands.cs:291-484`) |
| SAP response fields read | first present of `customerNumber`, `customer`, `kunnr`, `custNo`, `sk`; plus `messages[{type,id,number,message}]` |
| Which depot field is updated? | `code` ← SAP number; old code → `previousCode`; `sap.sapCustomerId` ← SAP number |
| SAP fails | approval still succeeds; `sapStatus` = `Rejected` (business error) or `Submitted`/`Syncing` (transport) |
| SAP returns no number | `sapStatus` = `Rejected` |
| Retry | none automatic for `Rejected`; `POST /customers/sap/retry-rejected` re-queues (no SAP call) then `push-pending` or the 15-minute job sends |
| Depot created in the portal via `POST /customers` | has an empty BP block → **not ready for SAP** → approving it ends in `sapStatus: Rejected` |

`TODO - Backend Confirmation Required`: a depot stuck in `Syncing` after a timeout has no portal action to resolve it (`link-sap` exists on the backend but is not in the portal).

## 11. Request / response contracts

### 11.1 Success envelope (all non-mobile endpoints)

```json
{
  "data": { },
  "meta": {
    "correlationId": "0HN6S2Q4B7K1M:00000003",
    "timestamp": "2026-09-25T03:30:00Z",
    "pagination": {
      "pageNumber": 1,
      "pageSize": 100,
      "totalCount": 6042,
      "totalPages": 61,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

- Paged lists: `data` is a **bare array**; paging is only in `meta.pagination`. There is **no** `success` flag and **no** `items` wrapper.
- 204 responses have no body. 201 responses carry a `Location` header.
- Portal decoding: `ApiWrapped<T>` in the repositories reads `data`, `meta.pagination.totalCount` and `meta.pagination.hasNextPage`; `unwrapPage()` / `unwrapData()` in `src/infrastructure/api/envelope.ts`.

### 11.2 Error format — RFC 9457 ProblemDetails

```json
{
  "type": "https://docs.isigroup.com.kh/errors/Customer.NotAwaitingApproval",
  "title": "The request could not be completed.",
  "status": 422,
  "detail": "Only a customer awaiting approval can be approved.",
  "instance": "/api/v1/admin/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/approve",
  "errorCode": "Customer.NotAwaitingApproval",
  "correlationId": "0HN6S2Q4B7K1M:00000007"
}
```

Validation failures add `"errors": { "reason": ["…"] }`. Framework 401/403 responses carry no `errorCode`.

### 11.3 Shared DTOs

Full field tables are in the use cases. Summary:

| DTO | Returned by | Use case |
|---|---|---|
| `CustomerListItemResponse` | API-01, API-02 | [UC-01](usecases/get-depots.md) |
| `CustomerResponse` | API-03, API-06, API-07, API-14 | [UC-03](usecases/get-depot-detail.md) |
| `AdminDepotDocumentsResponse` | API-04 | [UC-04](usecases/get-depot-documents.md) |
| `CustomerSapStatusDto` | API-09, API-20 | [UC-08](usecases/approve-depot.md) |
| `CustomerApprovalResponse` | API-10 | [UC-09](usecases/reject-depot.md) |
| `SapSyncStatusDto`, `SapPushSummaryDto` | API-15, API-18, API-19 | [UC-13](usecases/sap-sync.md) |
| `NonCustomerDto` | API-21 | [UC-15](usecases/get-non-bp-depots.md) |
| `DepotAssignmentImportResponse` | API-23 | [UC-16](usecases/import-depot-assignments.md) |

Conventions: JSON is camelCase; enums are **strings** (enum names); dates are ISO-8601 `DateTimeOffset` strings (the portal keeps them as `string`, never `Date`); IDs are GUID strings; money is a JSON number.

## 12. Web Portal model mapping

The portal model is `Depot = CrmDepot & { lifecycle?, …detail fields }` (`src/features/depots/repositories/types.ts`), built by `mapCustomerToDepot()` (`mappers.ts`). The approval decision page uses a separate Zod schema, `DepotDetailSchema` (`src/features/approvals/api.ts`), that mirrors `CustomerResponse` directly.

| Backend field | Portal `Depot` field | Transformation |
|---|---|---|
| `id` | `id` | none |
| `code` | `code` | none (changes after SAP registration) |
| `name` | `name` | none |
| `type` (`Retailer`/`Wholesaler`/`Distributor`/`KeyAccount`) | `type` | `retailer→Retail Shop`, `wholesaler→Distributor`, `distributor→Distributor`, `keyaccount→Depot`, other → `Depot` |
| `status` | `lifecycle` | case-insensitive match against `DEPOT_LIFECYCLE` |
| `status` | `status` (CRM) | `Draft`,`PendingApproval`→`Prospect`; `Active`→`Active`; `Suspended`→`At Risk`; `Closed`→`Inactive`; **`RegionManagerApproved`, `SalesManagerApproved`, `Rejected` → `Prospect` (fallback)** |
| `phone`, `contactPerson`, `email` | same names | `null` → `''` |
| `address.line1/line2/district/city/province` | `address` | joined with `, ` (list rows use `city`) |
| `address.province` | `province` | `null` → `''` |
| `address.district` | `district` | `null` → `''` |
| `address.latitude/longitude` | `lat`/`lng` | `null` → **`0`** (see §17) |
| `address.latitude/longitude` | `latitude`/`longitude` | `null` kept |
| `address.line1`, `line2`, `postalCode` | `addressLine1`, `addressLine2`, `postalCode` | `null` → `''` |
| `creditLimit` | `creditLimit` | `null` → `0` |
| `creditTermDays` | `creditTermDays`, `paymentTerms` | `paymentTerms = "Net {n}"` |
| `assignedSalesRepId` | `repId` | `null` → `''` |
| `createdAt` | `createdAt` | kept as ISO string |
| `telegramUsername` | `telegram` | `null` → `''` |
| `sap.sapCustomerId` | `sapId` | falls back to `code` |
| `canTrade` | `canTrade` | `null` → `false` |
| `description` | `notes` | `null` → `''` |
| `documents`, `missingRequiredDocuments`, `documentsComplete` | same | defaults `[]`, `[]`, `false` |

Portal fields with **no backend source** (`UNMAPPED_DEPOT_FIELDS`, filled with neutral blanks): `salesOrg`, `division`, `workingHours`, `creditStatus`, `outstanding`, `outstandingOrders`, `lastVisit`, `totalVisits`, `lifetimeValue`, `tier`, `notes`*, `industry`, `category`, `segment`, `paymentTerms`*, `website`, `registrationNo`, `salesValue`, `monthlyRevenue`, `nextFollowUp`, `openOpportunities`. (*partly derived above.)

`TODO - Backend Confirmation Required`: whether any of these commercial fields should be provided by the backend. The portal treats their absence as intended.

## 13. Validation rules

| Field | Rule | Enforced by |
|---|---|---|
| Create `code` | required, 2–32, `^[A-Za-z0-9-]+$`, upper-cased | backend |
| `name` | required, 2–256 (portal form: min 3) | both |
| `type` | required, `Retailer` \| `Wholesaler` \| `Distributor` \| `KeyAccount` | backend |
| `phone` | required, ≤32; 8–16 digits, optional leading `+` (portal form: `^[+\d][\d\s-]{6,}$`) | both |
| `email` | optional, valid email, ≤256 | both |
| `contactPerson` | optional ≤128 (portal form: **required**) | both |
| `address.line1` | required ≤256 | both |
| `address.city` | required ≤128 | backend (portal sends `district` or `province`) |
| `address.province` | optional ≤128 (portal form: **required**) | both |
| `address.latitude` / `longitude` | −90..90 / −180..180, must be sent together | backend |
| `creditLimit` | 0..1,000,000,000 | backend (portal: numeric only) |
| `creditTermDays` | 0..180 | backend |
| Reject / suspend `reason` | required, 3–512 characters | both |
| Link-SAP `sapCustomerNumber` | required, ≤10 characters | backend |
| Document upload | jpg/jpeg/png (+pdf for certificates), ≤10 MB, one per type, ≤20 total | backend (mobile upload) |
| Assignment import | `.xlsx` only, ≤5 MB | both |

## 14. Business rules

1. **BR-01** Approving is an act with its own permission and audit, never a `status` field on update.
2. **BR-02** Admin approve accepts only `PendingApproval` and makes the depot `Active` in one step.
3. **BR-03** Approval pushes to SAP synchronously; a SAP failure never rolls back the approval.
4. **BR-04** On SAP success the depot's `code` becomes the SAP customer number; the old code moves to `previousCode`. Clients must re-read the depot.
5. **BR-05** Reject requires a reason (3–512) and is allowed only before `Active`.
6. **BR-06** `Rejected` and `Closed` are terminal for approval; a rejected depot can be re-submitted.
7. **BR-07** Required documents: `STOREFRONT`, `INSIDE_STORE`, `ID_CARD`. Completeness is reported but **not enforced** at approval.
8. **BR-08** A depot the caller may not see returns **404**, not 403, so existence is not disclosed.
9. **BR-09** `customers.readall` lists every depot; without it `GET /customers` is scoped to the caller's own depots, and `/admin/depots` is 403.
10. **BR-10** Depot ownership (`assignedSalesRepId`) is set only at create; no endpoint reassigns it.
11. **BR-11** A depot assignment import creates route stops, not ownership, and is all-or-nothing (`imported`).
12. **BR-12** SAP push is not idempotent on SAP's side; `Syncing` is the duplicate guard.

## 15. Error handling

| Situation | Backend | Portal behaviour today (`src/domain/errors/api-error.ts`, `src/infrastructure/api/client.ts`) |
|---|---|---|
| Validation (FluentValidation / model binding) | 400 + `errors` | kind `unknown` (**400 is not mapped to `validation`**; only 422 is) |
| Not signed in / expired | 401 | refresh token once and replay; on failure sign out ("session expired") |
| Missing permission | 403 (`Auth.PermissionDenied` or no code) | kind `forbidden` |
| Not found / not visible | 404 `Customer.NotFound` | detail: "This registration could not be loaded."; list: error state |
| Conflict / concurrency | 409 (`Customer.DuplicateCode`, `General.ConcurrencyConflict`, `Customer.SapRegistrationInFlight`) | kind `conflict` |
| Business rule | 422 (`Customer.NotAwaitingApproval`, `Customer.NotRejectable`, …) | kind `validation` |
| SAP unavailable | 502 `Sap.*` (only on explicit SAP endpoints; approve returns 200 with `sapStatus`) | kind `server` |
| Server error | 500 | kind `server` |
| Timeout (client, default 15 s; import 120 s) | — | kind `timeout` |
| Network failure | — | kind `network` |

**Portal gap:** toasts on the depot screens show `err.message`, which for an `ApiError` is a message **key** (e.g. `api.error.validation`), and `messageKeyForCode` only knows `User.*`/`Role.*` codes. Depot error codes (`Customer.*`, `Sap.*`) therefore surface as generic keys. The decision page shows `error.message` the same way.

## 16. Pagination, filtering, search

| Screen | Endpoint | Sent | Server-side | Client-side |
|---|---|---|---|---|
| Depots | API-01 | `pageNumber`, `pageSize=200`, `search` (debounced 300 ms), `status` (lifecycle) | search, status, paging | — |
| My Depots | API-01 | `assignedSalesRepId` = current user, default `pageSize=200`, page 1 only | rep filter | status (CRM), province, type, rep, follow-up, revenue, search, column sort |
| NON-BP Depots | API-21 | `pageNumber`, `pageSize=200`, `search` | search, paging | — |
| Approval hub | API-02 | `pageSize=50` | fixed statuses | — |
| Approval queue | — | nothing (mock) | — | search over mock rows |

Backend parameters for `/admin/depots`: `pageNumber` (1), `pageSize` (100, clamped 1..1000), `search` (name, code, city), `status`, `type`, `assignedSalesRepId`, `sort` (`code`,`name`,`status`,`type`,`city`,`createdAt`; `-` prefix = descending; default `-createdAt`). No date filter, no location filter, no export.

## 17. Frontend ↔ backend mismatches

| # | Area | Portal expects / does | Backend does | Impact | Recommendation |
|---|---|---|---|---|---|
| M-01 | Create depot | `/depots/new` shows "Depot created" and calls nothing | `POST /customers` exists | **no depot is ever created from the portal** | wire the form to API-06 |
| M-02 | Create payload | `mapDepotToCustomerPayload` sends no `code`, no `type`; `city = district‖province` | `code` and `type` required | once wired, every create returns **400** | add `code` + `type` (backend vocabulary) to the payload, or let the backend generate `code` — `TODO - Backend Confirmation Required` |
| M-03 | Depot type vocabulary | form offers `Hardware Shop`, `Steel Shop`, `Depot`, … | `Retailer`, `Wholesaler`, `Distributor`, `KeyAccount` | invalid on create | agree one vocabulary |
| M-04 | Address fields | sends `district` | `district`, `country`, `region`, `houseNo` are **dropped** by `BuildAddress` on admin create/update | data loss | backend fix in `CreateCustomerCommand.cs:127-150` |
| M-05 | Approval queue page | `/approval/depots` renders `MOCK_DEPOTS` | `GET /admin/depots/pending-approval` exists | queue is fake; its links (`REQ-D-8821`) 404 on the decision page | wire to API-02 |
| M-06 | Chain stages | Approve shown for every `AWAITING_DECISION` state on `/depots` | admin approve only accepts `PendingApproval` → **422** at `RegionManagerApproved` / `SalesManagerApproved` | failed clicks | GAP-01: expose chain approval under `/admin`, or hide the button — `TODO - Backend Confirmation Required` |
| M-07 | Decision page | Approve/Reject hidden unless `status === 'PendingApproval'` | reject is valid at every pre-active stage | cannot reject mid-chain depots here | align with backend reject rule |
| M-08 | "Awaiting approval" filter | comment says three states; sends only `status=PendingApproval` | `/pending-approval` returns all three | incomplete queue | use API-02 for that filter |
| M-09 | Reject permission | code comment says `approvals.region` | admin reject requires `customers.approve` | documentation only | fix comment |
| M-10 | Rejection reason | modal says the reason is what the rep will see | `rejectionReason` not in `CustomerResponse`; no admin approval-history route | reason invisible in the portal | GAP-02 |
| M-11 | List assigned rep | shows `repById(repId)` on list rows | list rows have no `assignedSalesRepId`; `repById` searches **demo** reps | always "Unassigned" | GAP-04, GAP-05 |
| M-12 | Document completeness | approval hub schema reads `documentsComplete`, `documentCount` | always `true` / `0` on `/admin/depots*` | misleading | GAP-03 |
| M-13 | Coordinates | `lat/lng` default `0` when absent | `null` | pins at (0, 0) on maps | map to `NaN`/`null` like the planning adapters |
| M-14 | CRM status | `Rejected`, `RegionManagerApproved`, `SalesManagerApproved` map to `Prospect` | distinct statuses | a rejected depot reads "Prospect" | map explicitly; keep `lifecycle` as the truth |
| M-15 | Contacts | `DepotContactSchema.role` | `position` | role never shown | rename to `position` |
| M-16 | Document URL | Documents tab: `previewUrl`; decision page: `url` | both exist on their respective DTOs | consistent per endpoint | none — document it |
| M-17 | `publicUrl` | used when present | points to `/api/v1/public/customer-documents/{token}`, real route is `/files/customers/{publicToken}` | broken public links | backend fix (`CustomerDocumentQueries.cs:81`) |
| M-18 | Error messages | toast shows message key | `errorCode` `Customer.*` / `Sap.*` | users see raw keys | map depot error codes in `messageKeyForCode` |
| M-19 | 400 handling | `kindForStatus(400)` → `unknown` | validation errors are 400 | field errors not recognised | map 400 → `validation` |
| M-20 | Approve side effects | UI text: "Approving sends this depot to SAP" | true for admin approve; chain final stage only queues | none | document |
| M-21 | NON-BP actions | read-only list | approve/reject only under `/mobile/non-customers`; no convert | none today | `TODO - Backend Confirmation Required` if the portal must act on prospects |
| M-22 | My Depots | one request, first 200 rows, filters client-side | paging supported | reps with >200 depots see a partial list | page or raise `pageSize` (max 1000) |
| M-23 | New Depot extra fields | registration no., industry, category, website, job title, commune, revenue, payment terms, segment, preferred products, draft save | not in the backend model | silently lost | decide which to add — `TODO - Backend Confirmation Required` |
| M-24 | Credit limit hint | "Requests above $50,000 route for approval" | no such rule | misleading | confirm or remove — `TODO - Backend Confirmation Required` |

## 18. Open questions

All items are `TODO - Backend Confirmation Required` unless marked otherwise.

1. Should the portal drive the three-stage chain (region → sales → head), or is admin single-step approval the intended portal path? (M-06, GAP-01)
2. `TODO - Permission confirmation required` — should `Sales Representative` and `Sales Rep Regional` hold `customers.approve`? (§4.3)
3. Should admin approval enforce required documents (`STOREFRONT`, `INSIDE_STORE`, `ID_CARD`)?
4. Should admin approval write an `approval_records` row like the chain does?
5. Should approval / rejection notify the representative? (no notification handlers exist)
6. Who generates the depot `code` for portal-created depots (`BP-YYYYMM-NNNNN` like mobile, or user-entered)? (M-02)
7. How should portal-created depots get the business-partner block needed for SAP (`AccountGroup`, `BpRole`, `PartnerGroup`, sales area)? Without it, approval ends in `sapStatus: Rejected`.
8. How is a depot stuck in `Syncing` resolved from the portal? (`link-sap` has no UI.)
9. Is reassigning a depot's owner (`assignedSalesRepId`) required? (BR-10)
10. Must the portal approve, reject or convert NON-BP depots? (M-21)
11. Which endpoint should provide sales-rep names for depots — `GET /admin/sales-employees` or the users API? (GAP-04)
12. Should `/admin/depots` rows carry `assignedSalesRepId` and real document counts? (GAP-03, GAP-05)
13. Is the $50,000 credit-limit escalation a real rule? (M-24)
14. `TODO - Permission confirmation required` — the decision page has no in-page permission check; users with only `customers.create/update` (e.g. Supervisor) reach it via the `customers.manage` alias and get 403 on Approve.

## 19. Backend implementation checklist

Recommended order (dependencies first):

1. [ ] **Fix data loss**: pass `district`, `country`, `region`, `houseNo` through `BuildAddress` (M-04).
2. [ ] **Fix `publicUrl`** to `/files/customers/{publicToken}` (M-17).
3. [ ] **Expose rejection data** on `CustomerResponse` (`rejectionReason`, `rejectedAt`, `rejectedBy`, stage approvals) and add `GET /api/v1/admin/depots/{depotId}/approval-history` (GAP-02).
4. [ ] **List row enrichment** on `/admin/depots*`: `assignedSalesRepId` (+ name), real `documentCount` / `documentsComplete` (GAP-03, GAP-05).
5. [ ] **Decide the portal approval model** (Q1) and either expose chain stages under `/admin/depots/{id}/…/approve` or restrict the portal to `PendingApproval` (GAP-01).
6. [ ] **Confirm permissions** for `customers.approve` on field roles (Q2).
7. [ ] **Create contract** for the portal: `code` generation, `type` vocabulary, BP defaults for SAP readiness (Q6, Q7).
8. [ ] **Error codes** catalogue for `Customer.*` / `Sap.*` shared with the portal (M-18).
9. [ ] Optional: document enforcement at approval (Q3), notifications (Q5), owner reassignment (Q9), NON-BP admin actions (Q10).

Portal-side counterparts (for the frontend team): wire `/depots/new` (M-01..03), wire `/approval/depots` to API-02 (M-05), align the decision page with reject rules (M-07), use API-02 for "Awaiting approval" (M-08), rep names (M-11), coordinates (M-13), status mapping (M-14), contact `position` (M-15), error mapping (M-18, M-19).

## 20. Traceability

```text
User Story → Use Case → Web Portal Action → Backend API → Request → Backend Processing → Response → Web Portal Model → UI
```

| User story | Use case | Portal action | API | Portal model | UI |
|---|---|---|---|---|---|
| US-01 | UC-01 | open `/depots`, search, filter, page | API-01 | `PageResult<Depot>` | directory list |
| US-02 | UC-01 | open `/depots/my` | API-01 (`assignedSalesRepId`) | `PageResult<Depot>` | My Depots table |
| US-03 | UC-03 | select a depot | API-03 | `Depot` (merged) / `DepotDetailDto` | detail panel, decision page |
| US-04 | UC-04 | Documents tab / decision page gallery | API-04, API-05 | `DocumentsResponse` | document grid, lightbox |
| US-05 | UC-05 | submit New Depot form | API-06 | `Depot` | *(not wired)* |
| US-06 | UC-06 | edit depot | API-07 | `Depot` | *(no UI)* |
| US-07 | UC-07 | submit for approval | API-08 | — | *(no UI)* |
| US-08 | UC-02 | open `/approval`, `/approval/depots` | API-02 | `{ items, totalCount }` | hub card, queue *(mock)* |
| US-09 | UC-08 | Approve | API-09 → SAP → API-03 | `DepotDetailDto` | status chip, code, SAP block |
| US-10 | UC-09 | Reject + reason | API-10 → API-03 | `DepotDetailDto` | status chip |
| US-11 | UC-10 | Suspend / Reinstate | API-11, API-12 | — | *(no UI)* |
| US-12 | UC-13, UC-14 | SAP panel buttons | API-15..19, API-20 | `SapSyncStatus` | SAP sync panel |
| US-13 | UC-15 | open `/depots/non-bp` | API-21 | `PageResult<NonBpDepot>` | NON-BP list |
| US-14 | UC-16 | download template, upload workbook | API-22..24 | `ImportResultDto` | import result, error table |

Approval flow, validated against source:

```text
Approver (customers.approve)
  → /depots  or  /approval/depots/[id]              (queue page itself is mock — M-05)
  → select depot → GET /api/v1/customers/{id}         (useDepotApproval, staleTime 0)
  → Approve → POST /api/v1/admin/depots/{id}/approve  (useApproveDepot)
  → ApproveCustomerCommand: PendingApproval → Active
  → SubmitToSap → SapRegistrar.RegisterAsync(commit: true)
  → SAP CreateCust → customer number
  → code = SAP number, previousCode = BP-… , sapStatus = Registered
  ← 200 CustomerSapStatusDto
  → invalidate approvalKeys.depot(id) + approvalKeys.depots() → re-read
  → UI shows new status, code, previous code, SAP registration block
```

Note the step "Create/Approve Customer BP" is the same command: there is no separate BP-approval API.
