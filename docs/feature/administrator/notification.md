# Notifications — for Administrator

**Can call:** 27 of 27 endpoints
**Permissions held here:** `notifications.read`, `notifications.send`
**Full feature docs:** [../../notification/](../../notification/) · [integration.md](../../notification/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=notifications.read`, `isi:permission=notifications.send`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/notifications` | `notifications.read` |
| `GET` | `/api/v1/mobile/notifications/unread-count` | `notifications.read` |
| `PATCH` | `/api/v1/mobile/notifications/{notificationId}/read` | `notifications.read` |
| `PATCH` | `/api/v1/mobile/notifications/read-all` | `notifications.read` |
| `POST` | `/api/v1/mobile/notifications/{notificationId}/action` | `notifications.read` |
| `DELETE` | `/api/v1/mobile/notifications/{notificationId}` | `notifications.read` |
| `GET` | `/api/v1/mobile/notifications/preferences` | `notifications.read` |
| `PUT` | `/api/v1/mobile/notifications/preferences` | `notifications.read` |
| `POST` | `/api/v1/mobile/devices/register` | — (any token) |
| `GET` | `/api/v1/mobile/devices` | — (any token) |
| `DELETE` | `/api/v1/mobile/devices/{deviceId}` | — (any token) |
| `GET` | `/api/v1/notifications` | `notifications.read` |
| `GET` | `/api/v1/notifications/unread-count` | `notifications.read` |
| `GET` | `/api/v1/notifications/{notificationId}` | `notifications.read` |
| `POST` | `/api/v1/notifications/{notificationId}/read` | `notifications.read` |
| `POST` | `/api/v1/notifications/read-all` | `notifications.read` |
| `POST` | `/api/v1/notifications/{notificationId}/action` | `notifications.read` |
| `DELETE` | `/api/v1/notifications/{notificationId}` | `notifications.read` |
| `POST` | `/api/v1/admin/notifications/broadcast` | `notifications.send` |
| `POST` | `/api/v1/admin/notifications/push-all` | `notifications.send` |
| `POST` | `/api/v1/admin/notifications/test-push` | `notifications.send` |
| `GET` | `/api/v1/admin/notifications/logs` | `notifications.send` |
| `POST` | `/api/v1/devices` | — (any token) |
| `GET` | `/api/v1/devices` | — (any token) |
| `DELETE` | `/api/v1/devices/{deviceId}` | — (any token) |
| `GET` | `/api/v1/users/me/notification-preferences` | — (any token) |
| `PUT` | `/api/v1/users/me/notification-preferences` | — (any token) |

---

## Related

- [Administrator overview](README.md)
- [../../notification/integration.md](../../notification/integration.md) — the same feature for every role
