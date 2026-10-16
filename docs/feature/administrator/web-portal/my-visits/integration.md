# My Visits — integration

**Endpoints:** 5 across 1 controller
**Permissions:** `visits.create`, `visits.read`
**Status:** Active · **Last updated:** 2026-09-16

The representative's route book: the day's routes, their stops, and geofenced check-in and check-out.

This page is the front door: what to call, what you need to call it, and which
roles can. The detailed request and response contracts are in the linked
documents — this does not restate them.

---

## Before you call anything

1. Get a token from `POST /connect/token` (see
   [authentication/integration.md](../authentication/integration.md)).
2. Send it as `Authorization: Bearer <token>` on every request.
3. Check the caller holds the permission the endpoint needs — the token's
   `isi:permission` claims list them.

All routes below are versioned: `/api/v1/...`. Mobile responses are wrapped in
`MobileApiResponse<T>`; failures are RFC 9457 problem documents carrying a stable
`errorCode`. **Branch on `errorCode`, never on the message text.**

---

## Who can use it

| Permission | Rep | Regional | Manager | Head | Admin |
|---|---|---|---|---|---|
| `visits.create` | yes | yes | yes | yes | yes |
| `visits.read` | yes | yes | yes | yes | yes |

`·` means the role does not hold it, so those endpoints return **403**.

---|---|---|---|---|---|
| `visits.create` | yes | yes | yes | yes | yes |
| `visits.read` | yes | yes | yes | yes | yes |

`·` means the role does not hold it, so those endpoints return **403**.

---

## Endpoints

### `MobileVisitsController`

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/visits/routes` | `visits.read` |
| `GET` | `/api/v1/mobile/visits/routes/delta` | `visits.read` |
| `POST` | `/api/v1/mobile/visits/push` | `visits.create` |
| `POST` | `/api/v1/mobile/visits/telemetry` | `visits.create` |
| `POST` | `/api/v1/mobile/visits/photos` | `visits.create` |
---|---|---|
| `GET` | `/api/v1/mobile/visits/routes` | — |
| `GET` | `/api/v1/mobile/visits/routes/delta` | `visits.read` |
| `POST` | `/api/v1/mobile/visits/push` | `visits.read` |
| `POST` | `/api/v1/mobile/visits/telemetry` | `visits.create` |
| `POST` | `/api/v1/mobile/visits/photos` | `visits.create` |

---

## What to know before integrating

Mobile-only — there is no admin controller for visits.

Routes are **seeded**, not created through an API: no route-planning endpoint exists yet. The seeder gives each of the five representatives 4 routes a day for the current month, 3 stops each.

A stop needs customer coordinates to be geofenced. A customer without a pin produces a check-in recorded as unverifiable rather than rejected.

---

## Detailed contracts

- [api.md](api.md)
- [backend-integration.md](backend-integration.md)
- [workflow.md](workflow.md)
- [architecture.md](architecture.md)
- [README.md](README.md) — everything documented for this feature

## Roles

- [Sales Representative](../by-role/sales-representative/README.md)
- [Sales Rep Regional](../by-role/sales-rep-regional/README.md)
- [Sales Rep Manager](../by-role/sales-rep-manager/README.md)
- [Head of Sales](../by-role/head-of-sales/README.md)
- [Administrator](../by-role/administrator/README.md)
