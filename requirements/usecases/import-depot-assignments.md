# UC-16 — Import depot assignments

## Use Case Information

| | |
|---|---|
| **Name** | Import depot assignments |
| **Description** | Puts depots on representatives' days in bulk from an Excel workbook. An assignment is a **route stop for a date**, not a change of depot ownership. |
| **Actor** | Planner |
| **Roles** | `routes.manage` — Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Sales Rep Regional, Supervisor |
| **Preconditions** | Signed in with `routes.manage` |
| **Trigger** | `/depots/assignments`: Download template · Upload workbook · Download error report |

### Main flow

1. **Download template** → `GET /api/v1/admin/depot-assignments/template` → `.xlsx` generated per request with live rep and depot codes in the dropdowns.
2. The planner fills rows and uploads the file (`.xlsx` only; the portal rejects other extensions with "That is not an .xlsx file").
3. `POST /api/v1/admin/depot-assignments/import` (multipart, field `file`, client timeout 120 s).
4. The backend validates every row, resolves reps and depots, and **either imports all rows or none**.
5. Result: `imported: true` → toast "Imported {stopsCreated} depot call(s)" and the planning queries are invalidated. `imported: false` → toast "{failedRows} row(s) need fixing" and an error table.
6. Optional: **Download error report** → `POST …/import/error-report` with the same file → `.xlsx` of failed rows (dry run; writes nothing).

### Error flow

- **400 `Visit.ImportFileMissing`**, **400 `Visit.ImportFileNotXlsx`** · **403** · timeout (large files).

### Business rules

- BR-11: all-or-nothing. `successfulRows` counts rows that passed validation; if `imported` is false **nothing was saved**.
- Maximum file size 5 MB.
- Sheet headers: Assignment Date, Sales Rep Code, Sales Rep Name, Depot Code, Depot Name, Region Code, Start Date, End Date, Status. **Region Code, Start Date, End Date and Status are ignored** by the backend. `TODO - Backend Confirmation Required`: whether those columns should be honoured or removed from the template.

## API

| ID | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| API-22 | GET | `/api/v1/admin/depot-assignments/template` | — | `.xlsx` file |
| API-23 | POST | `/api/v1/admin/depot-assignments/import` | multipart `file` | `200 DepotAssignmentImportResponse` |
| API-24 | POST | `/api/v1/admin/depot-assignments/import/error-report` | multipart `file` | `.xlsx` file |

All require `routes.manage`. Code: `AdminDepotAssignmentsController.cs:65,120,161` (untracked file in the backend working tree).

### Response — `DepotAssignmentImportResponse`

```json
{
  "data": {
    "totalRows": 96,
    "successfulRows": 94,
    "failedRows": 2,
    "imported": false,
    "routesCreated": 0,
    "stopsCreated": 0,
    "errors": [
      {
        "row": 14,
        "assignmentDate": "2026-09-28",
        "salesRepCode": "EMP000219",
        "salesRepName": "Vannak Ouk",
        "depotCode": "6100006999",
        "depotName": "Unknown depot",
        "regionCode": "BTB",
        "message": "Depot code 6100006999 does not exist."
      }
    ]
  }
}
```

The error `message` text is illustrative (`TODO - Backend Confirmation Required`); the field names are from source.

| Field | Type | Description |
|---|---|---|
| `totalRows`, `successfulRows`, `failedRows` | int | row counts |
| `imported` | bool | **the only field that says whether anything was saved** |
| `routesCreated`, `stopsCreated` | int | |
| `errors[].row` | int | sheet row |
| `errors[].assignmentDate`, `salesRepCode`, `salesRepName`, `depotCode`, `depotName`, `regionCode` | string? | echo of the row |
| `errors[].message` | string | reason |

### HTTP status codes

`200` · `400` · `401` · `403`

## Backend → Web Portal Mapping

Portal Zod `ImportResultSchema` / `ImportErrorSchema` (`src/features/depot-assignments/api.ts`) match field-for-field (defaults: counts 0, `imported` false, `errors` []). File names come from `Content-Disposition`, falling back to `depot-assignments-template.xlsx` / `depot-assignment-errors.xlsx`.

## Portal status

Implemented.
