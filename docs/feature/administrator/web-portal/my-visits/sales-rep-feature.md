# Administrator API: Visit Operations - Sales Reps

This document defines the backend API requirements to support the **Sales Reps** module within the Visit Operations dashboard. This module is used to view, manage, and evaluate the performance of field sales representatives.

## Base Path
All endpoints fall under: `/api/v1/admin/sales-reps`

## 1. Get Sales Representatives
Retrieves a list of all active sales representatives along with high-level performance metrics.

**Endpoint:** `GET /`
**Authentication:** Required (Admin or SuperAdmin)

### Query Parameters
- `pageNumber` (int, default: 1): The current page.
- `pageSize` (int, default: 50): Number of items per page.
- `search` (string, optional): Filter by name or employee ID.

### Response (200 OK)
```json
{
  "items": [
    {
      "id": "R001",
      "name": "Chandy Neat",
      "email": "chandy@isisteels.com",
      "phone": "+855 12 345 678",
      "zone": "Phnom Penh Central",
      "metrics": {
        "monthlyVisitsCompleted": 45,
        "monthlyTarget": 50,
        "successRate": 90.0
      },
      "status": "active"
    }
  ],
  "totalCount": 42,
  "totalPages": 1,
  "currentPage": 1
}
```

## 2. Get Sales Rep Details
Fetches deep details about a specific sales rep, including their current assigned route and historical data.

**Endpoint:** `GET /{id}`
**Authentication:** Required

### Response (200 OK)
```json
{
  "id": "R001",
  "name": "Chandy Neat",
  "zone": "Phnom Penh Central",
  "joinDate": "2024-01-15T00:00:00Z",
  "assignedDepots": [
    { "id": "D100", "name": "Main Warehouse" }
  ],
  "recentActivity": [
    { "type": "check-in", "timestamp": "2026-09-17T08:00:00Z", "location": "D100" }
  ]
}
```

## 3. Update Sales Rep Zone / Status
Allows an administrator to reassign a rep to a different zone or suspend their field account.

**Endpoint:** `PATCH /{id}`
**Authentication:** Required

### Request Body
```json
{
  "zone": "Siem Reap",
  "status": "suspended"
}
```

### Response (200 OK)
Returns the updated Sales Rep object.
