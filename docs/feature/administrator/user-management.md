# User Management — for Administrator

**Can call:** 16 of 16 endpoints
**Permissions held here:** `permissions.manage`, `permissions.read`, `roles.manage`, `roles.read`, `sessions.revoke`, `users.create`, `users.deactivate`, `users.read`, `users.update`
**Full feature docs:** [../../user-management/](../../user-management/) · [integration.md](../../user-management/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=permissions.manage`, `isi:permission=permissions.read`, `isi:permission=roles.manage`, `isi:permission=roles.read`, `isi:permission=sessions.revoke`, `isi:permission=users.create`, `isi:permission=users.deactivate`, `isi:permission=users.read`, `isi:permission=users.update`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/users` | `users.read` |
| `GET` | `/api/v1/users/{userId}` | `users.read` |
| `POST` | `/api/v1/users` | `users.create` |
| `PUT` | `/api/v1/users/{userId}` | `users.update` |
| `PATCH` | `/api/v1/users/{userId}/status` | `users.deactivate` |
| `POST` | `/api/v1/users/{userId}/unlock` | `users.update` |
| `POST` | `/api/v1/users/{userId}/reset-password` | `users.update` |
| `DELETE` | `/api/v1/users/{userId}` | `users.update` |
| `POST` | `/api/v1/users/{userId}/sessions/revoke` | `sessions.revoke` |
| `GET` | `/api/v1/roles` | `roles.read` |
| `GET` | `/api/v1/roles/{roleId}` | `roles.read` |
| `POST` | `/api/v1/roles` | `roles.manage` |
| `PUT` | `/api/v1/roles/{roleId}` | `roles.manage` |
| `DELETE` | `/api/v1/roles/{roleId}` | `roles.manage` |
| `PUT` | `/api/v1/roles/{roleId}/permissions` | `permissions.manage` |
| `GET` | `/api/v1/permissions` | `permissions.read` |

---

## Related

- [Administrator overview](README.md)
- [../../user-management/integration.md](../../user-management/integration.md) — the same feature for every role
