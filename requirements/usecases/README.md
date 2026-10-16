# Depot Use Cases — Index

Each use case follows the same structure: **Use Case Information** → **API** → **Request** → **Response** → **Backend → Web Portal Mapping** → **Errors** → **Portal status**.

Status values, field names and endpoint IDs are the ones defined in [../README.md](../README.md) (§7 API list, §8 lifecycle). Envelope and error formats are in §11 and are not repeated in full in every file.

| ID | Use case | API | Portal status |
|---|---|---|---|
| UC-01 | [Get depots](get-depots.md) | API-01 `GET /api/v1/admin/depots` | implemented |
| UC-02 | [Get depots awaiting approval](get-pending-depots.md) | API-02 `GET /api/v1/admin/depots/pending-approval` | hub only; queue page is mock |
| UC-03 | [Get depot detail](get-depot-detail.md) | API-03 `GET /api/v1/customers/{customerId}` | implemented |
| UC-04 | [Get depot documents](get-depot-documents.md) | API-04, API-05 | implemented |
| UC-05 | [Create depot](create-depot.md) | API-06 `POST /api/v1/customers` | **not wired** |
| UC-06 | [Update depot](update-depot.md) | API-07 `PUT /api/v1/customers/{customerId}` | no UI |
| UC-07 | [Submit depot for approval](submit-depot.md) | API-08 `POST /api/v1/customers/{customerId}/submit` | no UI |
| UC-08 | [Approve depot](approve-depot.md) | API-09 `POST /api/v1/admin/depots/{depotId}/approve` | implemented |
| UC-09 | [Reject depot](reject-depot.md) | API-10 `POST /api/v1/admin/depots/{depotId}/reject` | implemented |
| UC-10 | [Suspend / reinstate depot](suspend-reinstate-depot.md) | API-11, API-12 | no UI |
| UC-11 | [Delete depot](delete-depot.md) | API-13 `DELETE /api/v1/customers/{customerId}` | no UI |
| UC-12 | [Get depot by code](get-depot-by-code.md) | API-14 `GET /api/v1/customers/by-code/{customerCode}` | unused |
| UC-13 | [Synchronise with SAP](sap-sync.md) | API-15..API-19 | implemented |
| UC-14 | [Link depot to an existing SAP customer](link-depot-to-sap.md) | API-20 `POST /api/v1/admin/depots/{depotId}/link-sap` | backend only |
| UC-15 | [Get NON-BP depots](get-non-bp-depots.md) | API-21 `GET /api/v1/admin/non-bp-depots` | implemented |
| UC-16 | [Import depot assignments](import-depot-assignments.md) | API-22..API-24 | implemented |
| UC-17 | [Get depot quotations](get-depot-quotations.md) | API-25 `GET /api/v1/quotations` | implemented (other feature) |

## Traceability

| Use case | User story | Portal screen / code |
|---|---|---|
| UC-01 | US-01, US-02 | `app/(portal)/depots/page.tsx`, `depots/my/page.tsx` → `depotsRepository.list` |
| UC-02 | US-08 | `app/(portal)/approval/page.tsx` → `usePendingDepots` |
| UC-03 | US-03, US-09, US-10 | `depots/page.tsx` → `depotsRepository.getById`; `approval/depots/[id]/page.tsx` → `useDepotApproval` |
| UC-04 | US-04 | `features/depots/components/depot-documents.tsx`; decision page gallery |
| UC-05 | US-05 | `depots/new/page.tsx` (not wired) → `depotsRepository.create` |
| UC-06 | US-06 | `depotsRepository.update` (no caller) |
| UC-07 | US-07 | `depotsRepository.submit` (no caller) |
| UC-08 | US-09 | `depots/page.tsx`, `approval/depots/[id]/page.tsx` → `approve` / `useApproveDepot` |
| UC-09 | US-10 | same pages → `reject` / `useRejectDepot` |
| UC-10 | US-11 | `depotsRepository.suspend/reinstate` (no caller) |
| UC-11 | — | `depotsRepository.delete` (no caller) |
| UC-12 | — | `depotsRepository.getByCode` (no caller) |
| UC-13 | US-12 | `features/depots/components/sap-sync-panel.tsx` |
| UC-14 | US-12 | — |
| UC-15 | US-13 | `depots/non-bp/page.tsx` → `nonBpDepotsRepository.list` |
| UC-16 | US-14 | `depots/assignments/page.tsx` → `features/depot-assignments` |
| UC-17 | US-03 | `features/depots/components/depot-quotations.tsx` |
