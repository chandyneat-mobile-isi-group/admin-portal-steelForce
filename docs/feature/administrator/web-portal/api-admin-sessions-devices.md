# Administrator API: Sessions & Devices Management

This document defines the backend API requirements to support the "Sessions & Devices" web portal module. This module allows administrators to monitor active sessions across all field sales representatives, track their physical devices, observe their last known location, and proactively revoke sessions for security purposes.

## Base Path
All endpoints fall under: `/api/v1/admin/sessions`

## 1. Get Active Sessions & Devices

Retrieves a paginated list of all active sessions and their associated devices, sales reps, and location.

**Endpoint:** `GET /`
**Authentication:** Required (Admin or SuperAdmin role with `roles.read` / `sessions.read` permission).

### Query Parameters
- `pageNumber` (int, default: 1): The current page.
- `pageSize` (int, default: 50): Number of items per page.
- `search` (string, optional): Filter by Sales Rep Name, Rep ID, or Device Model.
- `status` (string, optional): Filter by status (`online`, `offline`).

### Response (200 OK)

```json
{
  "items": [
    {
      "id": "sess_1a2b3c",
      "repId": "R001",
      "repName": "Chandy Neat",
      "status": "online",
      "lastActive": "2026-09-17T07:22:10Z",
      "device": {
        "type": "mobile",
        "os": "iOS 17.4",
        "appVersion": "2.1.0",
        "model": "iPhone 15 Pro"
      },
      "location": {
        "lat": 11.5564,
        "lng": 104.9282,
        "label": "Phnom Penh, KH"
      }
    }
  ],
  "totalCount": 142,
  "totalPages": 3,
  "currentPage": 1
}
```

## 2. Revoke Session

Forcefully terminates an active session. The next time the device attempts to authenticate or make an API request with its JWT, the server should reject it (e.g., via a Redis token blacklist or invalidating the refresh token family).

**Endpoint:** `POST /{id}/revoke`
**Authentication:** Required (Admin or SuperAdmin role).

### Path Parameters
- `id` (string): The unique identifier of the session to revoke.

### Response (204 No Content)
Returns `204 No Content` upon successful revocation.

### Response (404 Not Found)
If the session ID does not exist.

### Response (400 Bad Request)
If the session has already been terminated or cannot be revoked.

## Data Model Notes

- **`status`**: Can be derived by checking if the session has sent telemetry or API requests within a predefined threshold (e.g., last 15 minutes = `online`, otherwise `offline`).
- **`location.label`**: The backend should ideally perform a reverse geocoding lookup (e.g., via Google Maps API) on the raw coordinates when the telemetry data is ingested, saving the readable address to the session state for efficient dashboard querying.
