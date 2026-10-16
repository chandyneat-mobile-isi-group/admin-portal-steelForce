# Materials — for Administrator

**Can call:** 31 of 31 endpoints
**Permissions held here:** `materials.read`, `materials.sync`
**Full feature docs:** [../../material/](../../material/) · [integration.md](../../material/integration.md)
**Status:** Active · **Last updated:** 2026-09-16

What **Administrator** can actually call, generated from the live `role_permissions`
table and the controller attributes — not what the feature offers in general.

---

## How to integrate

1. Sign in as a Administrator: see [authentication.md](authentication.md).
2. Send `Authorization: Bearer <token>` on every request below.
3. The token must carry these claims: `isi:permission=materials.read`, `isi:permission=materials.sync`.

Mobile responses are wrapped in `MobileApiResponse<T>`; failures are RFC 9457
problem documents carrying a stable `errorCode`. Branch on `errorCode`, never on
the message text.

---

## Endpoints

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/v1/mobile/materials` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/search` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/{materialId}` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/by-number/{materialNumber}` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/types` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/groups` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/plants` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/storage-locations` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/{material}/availability` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/selection/categories` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/selection/schema` | `materials.read` |
| `POST` | `/api/v1/mobile/materials/selection/facets` | `materials.read` |
| `POST` | `/api/v1/mobile/materials/selection/materials` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/{material}/stock` | `materials.read` |
| `GET` | `/api/v1/mobile/materials/{material}/stock/check` | `materials.read` |
| `GET` | `/api/v1/materials` | `materials.read` |
| `GET` | `/api/v1/materials/{materialId}` | `materials.read` |
| `GET` | `/api/v1/materials/by-number/{materialNumber}` | `materials.read` |
| `GET` | `/api/v1/materials/types` | `materials.read` |
| `GET` | `/api/v1/materials/groups` | `materials.read` |
| `GET` | `/api/v1/materials/price-groups` | `materials.read` |
| `GET` | `/api/v1/materials/plants` | `materials.read` |
| `GET` | `/api/v1/materials/storage-locations` | `materials.read` |
| `GET` | `/api/v1/materials/{material}/check` | `materials.read` |
| `GET` | `/api/v1/materials/{material}/availability` | `materials.read` |
| `POST` | `/api/v1/materials/sync` | `materials.sync` |
| `GET` | `/api/v1/materials/stock/detail` | `materials.read` |
| `GET` | `/api/v1/materials/{material}/stock` | `materials.read` |
| `POST` | `/api/v1/materials/sync-stock` | `materials.sync` |
| `POST` | `/api/v1/materials/sync-references` | `materials.sync` |
| `POST` | `/api/v1/materials/sync-all` | `materials.sync` |

---

## Related

- [Administrator overview](README.md)
- [../../material/integration.md](../../material/integration.md) — the same feature for every role
