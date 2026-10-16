# Administrator API: Visit Operations - Visits

This document defines the backend API requirements to support the **Visits** module within the Visit Operations dashboard. This module is used to track the real-time status of all daily field visits, including check-ins, check-outs, notes, and fraud detection flags.

## Base Path
All endpoints fall under: `/api/v1/admin/visits`

## 1. Get Today's Visits
Retrieves the list of all scheduled and completed visits for a given date across the entire organization (or filtered by zone/rep).

**Endpoint:** `GET /`
**Authentication:** Required (Admin or SuperAdmin)

### Query Parameters
- `date` (string, YYYY-MM-DD, default: today): Fetch visits for this date.
- `pageNumber` (int, default: 1)
- `pageSize` (int, default: 50)
- `repId` (string, optional): Filter by a specific sales rep.
- `status` (string, optional): Filter by status (`pending`, `in_progress`, `completed`, `cancelled`).

### Response (200 OK)
```json
{
  "items": [
    {
      "id": "visit_888",
      "repId": "R001",
      "repName": "Chandy Neat",
      "customerId": "C999",
      "customerName": "ISI Depot Central",
      "scheduledTime": "2026-09-17T09:00:00Z",
      "actualCheckInTime": "2026-09-17T09:05:00Z",
      "actualCheckOutTime": null,
      "status": "in_progress",
      "fraudFlags": [],
      "notes": "Met with the depot manager."
    }
  ],
  "totalCount": 120,
  "totalPages": 3,
  "currentPage": 1
}
```

## 2. Get Visit Details & Telemetry
Retrieves the exact GPS breadcrumbs and check-in validation data for a specific visit to verify compliance.

**Endpoint:** `GET /{id}/telemetry`
**Authentication:** Required

### Response (200 OK)
```json
{
  "visitId": "visit_888",
  "expectedLocation": { "lat": 11.55, "lng": 104.92 },
  "actualCheckInLocation": { "lat": 11.5501, "lng": 104.9202 },
  "distanceVarianceMeters": 15,
  "isValid": true
}
```

## 3. Override Visit Status
Allows an administrator to manually override a visit status (e.g. marking a visit as cancelled or waiving a fraud flag).

**Endpoint:** `PATCH /{id}/status`
**Authentication:** Required

### Request Body
```json
{
  "status": "cancelled",
  "reason": "Depot was closed due to holiday."
}
```

### Response (200 OK)
Returns the updated Visit object.
