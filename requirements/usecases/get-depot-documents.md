# UC-04 — Get depot documents

## Use Case Information

| | |
|---|---|
| **Name** | Get depot documents |
| **Description** | Lists a depot's registration documents with completeness, and streams each file for preview. |
| **Actor** | Portal user / approver |
| **Roles** | `customers.read` |
| **Preconditions** | Signed in; depot visible to the caller |
| **Trigger** | Opening the **Documents** tab on `/depots`; opening `/approval/depots/{id}` (gallery) |

### Main flow

1. `DepotDocuments` calls `GET /api/v1/admin/depots/{depotId}/documents`.
2. The backend returns the document list, `missingRequired` and `isComplete`.
3. For each image the portal downloads bytes from `previewUrl` with the bearer token (`apiClient.downloadFile`) and shows a blob URL; PDFs open the same way.
4. Documents are grouped into four sections (storefront, inside, owner ID, tax documents).

### Alternative flows

- **A1 — Decision page:** uses `documents[].url` from UC-03 instead of this endpoint, downloading each image the same way.
- **A2 — No documents:** empty state; `missingRequired` lists what is needed.

### Error flow

- **E1 — 404:** depot missing, not visible (a caller without `customers.readall` who is not the assigned rep), or document missing.
- **E2 — a single image fails:** the tile shows a failure state; others still load.

### Business rules

- BR-07: required types `STOREFRONT`, `INSIDE_STORE`, `ID_CARD`; optional `PATENT_TAX`, `VAT_CERTIFICATE`.
- `ID_CARD`, `PATENT_TAX`, `VAT_CERTIFICATE` are sensitive; only `STOREFRONT` is public (`publicUrl`).
- Upload (mobile only): jpg/jpeg/png, pdf for certificates, ≤10 MB, one per type (replace), ≤20 in total.

## API

### API-04 — List

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/admin/depots/{depotId}/documents` |
| **Authorization** | `customers.read` |
| **Path** | `depotId` — GUID |
| **Code** | `AdminDepotsController.cs:305`, `GetAdminDepotDocumentsQuery.cs` |

Request:

```http
GET /api/v1/admin/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/documents
Authorization: Bearer eyJhbGciOi...
```

Response — 200 (`AdminDepotDocumentsResponse`):

```json
{
  "data": {
    "depotId": "5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10",
    "documents": [
      {
        "id": "7e2f4b10-9c3a-4d8e-b1a2-5f6c7d8e9f01",
        "type": "STOREFRONT",
        "typeDisplay": "Storefront",
        "fileName": "storefront.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 482113,
        "previewUrl": "/api/v1/admin/depots/5b6e1c1e-2f0a-4c55-9a3e-7c1d2b4a9f10/documents/7e2f4b10-9c3a-4d8e-b1a2-5f6c7d8e9f01/content",
        "publicUrl": null,
        "capturedAt": "2026-09-17T04:10:00Z",
        "uploadedAt": "2026-09-17T04:12:00Z",
        "isImage": true
      }
    ],
    "missingRequired": ["INSIDE_STORE", "ID_CARD"],
    "isComplete": false
  },
  "meta": { "correlationId": "0HN6S2Q4B7K1M:00000005", "timestamp": "2026-09-25T03:32:00Z" }
}
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `depotId` | GUID | no | |
| `documents[].id` | GUID | no | |
| `documents[].type` | string | no | `STOREFRONT` \| `INSIDE_STORE` \| `ID_CARD` \| `PATENT_TAX` \| `VAT_CERTIFICATE` |
| `documents[].typeDisplay` | string | no | label |
| `documents[].fileName` | string | no | |
| `documents[].contentType` | string | no | `image/jpeg`, `image/png`, `application/pdf` |
| `documents[].sizeBytes` | int | no | |
| `documents[].previewUrl` | string | no | authenticated content route (API-05) |
| `documents[].publicUrl` | string | yes | **wrong route today** (M-17) |
| `documents[].capturedAt`, `uploadedAt` | ISO datetime | no | |
| `documents[].isImage` | bool | no | |
| `missingRequired` | string[] | no | |
| `isComplete` | bool | no | |

Status codes: `200` · `401` · `403` · `404`

### API-05 — Content

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/admin/depots/{depotId}/documents/{documentId}/content` |
| **Authorization** | `customers.read` |
| **Response** | raw bytes with the original `Content-Type` and file name; ProblemDetails `404` when missing |
| **Code** | `AdminDepotsController.cs:334` |

## Backend → Web Portal Mapping

Portal types: `DocumentsResponse` / `DocumentDto` (local interfaces in `src/features/depots/components/depot-documents.tsx`).

| Backend | Portal | Match |
|---|---|---|
| `depotId` | `depotId` | ✓ |
| `documents[]` (all fields) | `DocumentDto` (`id,type,typeDisplay?,fileName?,contentType?,sizeBytes?,previewUrl,publicUrl?,capturedAt?,uploadedAt?,isImage?`) | ✓ |
| `missingRequired` | `missingRequired` | ✓ |
| `isComplete` | `isComplete` | ✓ |

Note: this endpoint uses `previewUrl` / `missingRequired` / `isComplete`, while `CustomerResponse` (UC-03) uses `url` / `missingRequiredDocuments` / `documentsComplete`. Both portal consumers read the right names for their endpoint (M-16).

## Portal status

Implemented. Backend fix: M-17 (`publicUrl` route).
