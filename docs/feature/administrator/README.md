# Administrator

**Permissions:** 83 · **Clients:** `isi-mobile` and `isi-portal`
**Seeded example:** `admin@isigroup.com.kh` (Platform Administrator)
**Status:** Active · **Last updated:** 2026-09-16

Generated from the live `role_permissions` table, not from intent. If this
disagrees with the running system, the table is right and this page is stale.

---

## What this role is

Holds every permission in the catalogue — 83 of them, the full
`PermissionCatalog`. Three are unique to it among these five:
**`users.impersonate`**, **`permissions.manage`** and **`roles.manage`**, plus the
destructive **`customers.delete`**, **`files.delete`** and **`outlets.delete`**.

It is a platform-operations account, not a commercial one. Day-to-day sales work
should be done by the role that owns it, so that the audit trail names a person
with a job rather than "the administrator".

---

## What it adds over Head of Sales

22 permissions beyond [Head of Sales](../head-of-sales/README.md):

```text
agreements.approve_consultant, agreements.prepare, agreements.sap,
agreements.verify, ai.configure, approvals.region, approvals.sales,
customers.delete, files.delete, inventory.adjust, noncustomers.create,
noncustomers.update, outlets.delete, permissions.manage, permissions.read,
roles.manage, roles.read, sessions.revoke, stockcount.perform,
users.create, users.deactivate, users.impersonate
```

---

## Features it can use

| Feature | Permissions held | How to integrate |
|---|---|---|
| [Authentication](../../authentication/) | `access.mobile`, `access.portal` | [integration.md](../../authentication/integration.md) |
| [Depot / Customers](../../depot/) | `approvals.act`, `approvals.head`, `approvals.read`, `approvals.region`, `approvals.sales`, `customers.approve` +7 more | [integration.md](../../depot/integration.md) |
| [Materials](../../material/) | `inventory.adjust`, `inventory.read`, `materials.read`, `materials.sync` | [integration.md](../../material/integration.md) |
| [Pricing](../../pricing/) | `customers.read` | [integration.md](../../pricing/integration.md) |
| [My Visits](../../my-visits/) | `routes.manage`, `routes.read`, `visits.create`, `visits.read`, `visits.readall`, `visits.update` | [integration.md](../../my-visits/integration.md) |
| [Non-customers](../../non-customer/) | `noncustomers.approve`, `noncustomers.create`, `noncustomers.read`, `noncustomers.readall`, `noncustomers.update` | [integration.md](../../non-customer/integration.md) |
| [Notifications](../../notification/) | `notifications.read`, `notifications.send` | [integration.md](../../notification/integration.md) |
| [Quotations & Orders](../../quotation-orders/) | `orders.approve`, `orders.cancel`, `orders.create`, `orders.read`, `orders.readall`, `orders.update` +6 more | [integration.md](../../quotation-orders/integration.md) |
| [Promotions & Discounts](../../prom-discount/) | `agreements.approve_consultant`, `agreements.approve_final`, `agreements.prepare`, `agreements.read`, `agreements.readall`, `agreements.request` +4 more | [integration.md](../../prom-discount/integration.md) |
| [User Management](../../user-management/) | `permissions.manage`, `permissions.read`, `roles.manage`, `roles.read`, `sessions.revoke`, `users.create` +4 more | [integration.md](../../user-management/integration.md) |
| [Platform](../../platform/) | `ai.configure`, `ai.query`, `audit.read`, `dashboard.read`, `dashboard.readall`, `files.delete` +13 more | [integration.md](../../platform/integration.md) |

---

## Scoping

This role holds these unscoped read permissions:

- `agreements.readall`
- `customers.readall`
- `dashboard.readall`
- `noncustomers.readall`
- `orders.readall`
- `quotations.readall`
- `visits.readall`

Each one widens the matching list from *the caller's own records* to
*everything*. A list endpoint checks for it at request time and changes its
`WHERE` clause accordingly — the route does not change, so the same call
returns a different number of rows for a different role.

---

## Signing in

Both clients use the OpenIddict password grant at `POST /connect/token`.

The issued access token carries one `isi:permission` claim per permission above.
Authorize screens from those claims rather than from the role name — a role's
grants are data and can change without an app release.

See [authentication/integration.md](../../authentication/integration.md) for the
full exchange, refresh handling and the mobile phone/OTP variant.

---

## Related

- [by-role/README.md](../README.md) — the full role-to-feature matrix
- [user-management/](../../user-management/) — how roles and grants are administered

---

## This folder

One file per feature, listing only what this role can call:

| Feature | Can call | Blocked |
|---|---|---|
| [Authentication](authentication.md) | 18 | — |
| [Depot / Customers](depot.md) | 43 | — |
| [Materials](material.md) | 31 | — |
| [Pricing](pricing.md) | 4 | — |
| [My Visits](my-visits.md) | 5 | — |
| [Non-customers](non-customer.md) | 6 | — |
| [Notifications](notification.md) | 27 | — |
| [Quotations & Orders](quotation-orders.md) | 21 | — |
| [Promotions & Discounts](prom-discount.md) | 21 | — |
| [User Management](user-management.md) | 16 | — |
| [Platform](platform.md) | 5 | — |
