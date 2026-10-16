# Administrator API: Visit Operations - Planning

This document defines the backend API requirements to support the **Planning** module within the Visit Operations dashboard of the admin web portal. This module allows administrators to create daily routes, assign depots/customers to specific sales reps, and optimize the sequence of stops.

## Base Path
All endpoints fall under: `/api/v1/admin/planning`

## 1. Get Plan Definitions
Retrieves the list of existing daily plans or draft routes for a specific date or date range.

**Endpoint:** `GET /plans`
**Authentication:** Required (Admin or SuperAdmin)

### Query Parameters
- `date` (string, YYYY-MM-DD): Fetch routes assigned for a specific date.
- `repId` (string, optional): Filter by a specific sales rep.

### Response (200 OK)
```json
{
  "items": [
    {
      "id": "plan_7a8b9c",
      "repId": "R001",
      "repName": "Chandy Neat",
      "date": "2026-09-17",
      "status": "draft",
      "stopCount": 5,
      "estimatedDistanceKm": 24.5
    }
  ]
}
```

## 2. Get Stops for a Plan
Retrieves the exact sequence of customer/depot stops assigned to a specific plan.

**Endpoint:** `GET /plans/{id}/stops`
**Authentication:** Required

### Response (200 OK)
```json
{
  "items": [
    {
      "id": "stop_123",
      "sequence": 1,
      "customerId": "C999",
      "customerName": "ISI Depot Central",
      "location": { "lat": 11.55, "lng": 104.92 },
      "priority": "high",
      "status": "pending"
    }
  ]
}
```

## 3. Save / Publish Plan
Persists a new route or updates an existing route with a new sequence of stops.

**Endpoint:** `POST /plans`
**Authentication:** Required

### Request Body
```json
{
  "repId": "R001",
  "date": "2026-09-18",
  "stops": [
    { "customerId": "C999", "sequence": 1 },
    { "customerId": "C888", "sequence": 2 }
  ]
}
```

### Response (201 Created)
Returns the newly created Plan ID and confirmation.
