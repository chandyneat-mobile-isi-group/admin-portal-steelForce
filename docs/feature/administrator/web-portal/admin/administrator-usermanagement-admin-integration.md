# Administrator User Management — Admin Integration Guide

Complete integration guide for the **Administration Portal** web client to manage users, roles, and permission assignments in the ISI Steels 360 platform.

- **Base URL:** `https://<host>/api/v1`
- **Audience:** Administration Portal (`ApiAudience.Admin`)
- **Authentication:** Bearer token (`Authorization: Bearer <access_token>`)
- **Conventions:** Wrapped JSON success envelope, RFC 9457 ProblemDetails on error.

---

## Table of Contents

1. [Authorization & Security Architecture](#1-authorization--security-architecture)
2. [Endpoints Reference](#2-endpoints-reference)
3. [User Management APIs](#3-user-management-apis)
   - [3.1 List Users (Paged, Filtered, Sorted)](#31-list-users-paged-filtered-sorted)
   - [3.2 Get User by ID](#32-get-user-by-id)
   - [3.3 Create User Account](#33-create-user-account)
   - [3.4 Update User Account & Roles](#34-update-user-account--roles)
   - [3.5 Activate / Deactivate User](#35-activate--deactivate-user)
   - [3.6 Unlock User Account](#36-unlock-user-account)
   - [3.7 Admin Reset Password](#37-admin-reset-password)
   - [3.8 Delete User Account (Soft Delete)](#38-delete-user-account-soft-delete)
   - [3.9 Revoke User Sessions](#39-revoke-user-sessions)
   - [3.10 Bulk Delete User Accounts](#310-bulk-delete-user-accounts)
   - [3.11 List Departments](#311-list-departments)
4. [Role & Permission Management APIs](#4-role--permission-management-apis)
   - [4.1 List Roles](#41-list-roles)
   - [4.2 Get Role by ID](#42-get-role-by-id)
   - [4.3 Create Role](#43-create-role)
   - [4.4 Update Role](#44-update-role)
   - [4.5 Delete Role](#45-delete-role)
   - [4.6 Set Role Permissions](#46-set-role-permissions)
   - [4.7 List Available Permissions by Module](#47-list-available-permissions-by-module)
5. [Error Handling & Error Codes](#5-error-handling--error-codes)
6. [Real-Time Updates (SignalR)](#6-real-time-updates-signalr)
7. [Frontend Integration Patterns (TypeScript / React)](#7-frontend-integration-patterns-typescript--react)

---

## 1. Authorization & Security Architecture

Access to administrative user management is governed by granular permissions rather than role names. An authenticated admin token must contain the requisite `isi:permission` claims or hold the permission through their assigned roles:

| Permission Key | Description | Admin Capability |
|---|---|---|
| `users.read` | View users | View user directory, pagination, filter, search, and user details |
| `users.create` | Create users | Provision new user accounts with initial credentials and roles |
| `users.update` | Edit users | Edit user profiles, SAP employee codes, unlock, and reset passwords |
| `users.deactivate` | Deactivate users | Enable or disable user sign-in without deleting historical records |
| `roles.read` | View roles | List and inspect roles, their user counts, and granted permissions |
| `roles.manage` | Manage roles | Create, update, and delete non-system roles |
| `permissions.read` | View permissions | Query the complete catalog of permissions grouped by module |
| `permissions.manage` | Manage permissions | Replace permission grants on roles |
| `sessions.revoke` | Revoke sessions | Force sign-out across all devices for a target user |

### Safety Guardrails
- **Self-Protection:** An administrator cannot deactivate (`User.CannotDeactivateSelf`) or delete (`User.CannotDeleteSelf`) their own account.
- **System Role Protection:** System roles such as `Administrator` cannot be renamed or deleted (`Role.SystemImmutable`).
- **Referential Integrity:** A role cannot be deleted if active users are currently assigned to it (`Role.HasAssignedUsers`).
- **Last Administrator:** The final *enabled* holder of the `Administrator` role cannot be deactivated or deleted (`User.CannotModifySystemAdmin`). A disabled administrator does not count as cover, because they cannot sign in to reverse the change. Removing an administrator while another enabled one remains is allowed.
- **Identifier Uniqueness:** E-mail, employee code and phone number are each unique across undeleted accounts (`User.EmailAlreadyExists`, `User.EmployeeCodeAlreadyExists`, `User.PhoneNumberAlreadyExists`). The phone number is checked because it doubles as a sign-in identifier for the field application.
- **Immediate Invalidation:** Changes to roles or permissions immediately invalidate the user's Redis cache entry (`IPermissionService.InvalidateAsync` / `InvalidateRoleAsync`), and deactivation/password reset revokes all active device sessions.

---

### Audit Trail

Security-relevant administrative actions are appended to `admin_audit_logs`: account
creation and deletion, status changes, unlocks, administrator password resets, session
revocations, role assignment changes, role creation and deletion, and permission
replacements. Each entry records the action, the acting administrator, the target, the
IP address, the request correlation id, and a short summary.

The table is append-only and **never stores a credential** — a password reset entry
records that a password was set and how many sessions that cost, never the value.
Who created, changed or deleted a user is also on the user record itself
(`createdBy`, `updatedBy`), which is what `GET /api/v1/users/{userId}` returns.

> [!NOTE]
> There is no read API for the trail in this release. It is queried directly against the
> database. The `audit.read` permission exists in the catalogue for when one is added.

---

## 2. Endpoints Reference

### Users (`/api/v1/users`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | `users.read` | Query users with paging, search, status, role, and department filters |
| `GET` | `/api/v1/users/{userId}` | `users.read` | Get detailed user information, assigned roles, and effective permissions |
| `POST` | `/api/v1/users` | `users.create` | Provision a new user account |
| `PUT` | `/api/v1/users/{userId}` | `users.update` | Update user profile, territory, department, and role assignments |
| `PATCH` | `/api/v1/users/{userId}/status` | `users.deactivate` | Toggle active status (`isActive: true/false`) |
| `POST` | `/api/v1/users/{userId}/unlock` | `users.update` | Unlock account after failed sign-in lockout |
| `POST` | `/api/v1/users/{userId}/reset-password` | `users.update` | Directly set a new password for the user |
| `DELETE` | `/api/v1/users/{userId}` | `users.update` | Soft-delete user account and revoke all sessions |
| `POST` | `/api/v1/users/{userId}/sessions/revoke` | `sessions.revoke` | Revoke all active device sessions for the user |
| `POST` | `/api/v1/users/bulk-delete` | `users.update` | Soft-delete several accounts, reporting per-account outcomes |
| `GET` | `/api/v1/departments` | `users.read` | List the departments in use, with account counts |

### Roles & Permissions (`/api/v1/roles`, `/api/v1/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/roles` | `roles.read` | List all roles with user count and permission keys |
| `GET` | `/api/v1/roles/{roleId}` | `roles.read` | Get single role details |
| `POST` | `/api/v1/roles` | `roles.manage` | Create a new custom role |
| `PUT` | `/api/v1/roles/{roleId}` | `roles.manage` | Update role name and description |
| `DELETE` | `/api/v1/roles/{roleId}` | `roles.manage` | Delete a non-system role with 0 assigned users |
| `PUT` | `/api/v1/roles/{roleId}/permissions` | `permissions.manage` | Atomically replace all permissions on a role |
| `GET` | `/api/v1/permissions` | `permissions.read` | List all permissions grouped by business module |

---

## 3. User Management APIs

### 3.1 List Users (Paged, Filtered, Sorted)

`GET /api/v1/users`

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `pageNumber` | `int` | `1` | 1-based page index |
| `pageSize` | `int` | `25` | Page size (clamped to max 200) |
| `search` | `string` | — | Free-text search matching name, email, phone, or employee code |
| `sort` | `string` | `-createdAt` | Comma-separated sort keys (e.g. `name`, `-createdAt`, `email`, `employeeCode`, `lastLoginAt`) |
| `isActive` | `boolean` | — | Filter by account status (`true` / `false`) |
| `role` | `string` | — | Filter by role name (e.g. `Sales Representative`) |
| `department` | `string` | — | Filter by department (e.g. `Field Sales`) |
| `territoryCode` | `string` | — | Filter by sales territory (e.g. `PP-NORTH`) |

#### Example Request
```http
GET /api/v1/users?pageNumber=1&pageSize=10&search=dara&isActive=true&sort=-createdAt HTTP/1.1
Host: api.isigroup.com.kh
Authorization: Bearer <admin_access_token>
```

#### Example Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "01923f81-7d12-7000-8000-000000000001",
      "fullName": "Chan Dara",
      "email": "dara.chan@isigroup.com.kh",
      "phoneNumber": "012345678",
      "employeeCode": "EMP000101",
      "jobTitle": "Senior Sales Representative",
      "department": "Field Sales",
      "territoryCode": "PP-NORTH",
      "depotCode": "DEPOT-PP01",
      "isActive": true,
      "roles": [
        "Sales Representative"
      ],
      "lastLoginAt": "2026-08-20T08:30:00+07:00",
      "createdAt": "2026-08-10T09:15:00+07:00"
    }
  ],
  "meta": {
    "correlationId": "0HN8F1K2:00000001",
    "timestamp": "2026-08-21T16:00:00.000Z",
    "pagination": {
      "pageNumber": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### 3.2 Get User by ID

`GET /api/v1/users/{userId}`

#### Example Response (`200 OK`)
```json
{
  "data": {
    "id": "01923f81-7d12-7000-8000-000000000001",
    "fullName": "Chan Dara",
    "email": "dara.chan@isigroup.com.kh",
    "emailConfirmed": true,
    "phoneNumber": "012345678",
    "phoneNumberConfirmed": true,
    "employeeCode": "EMP000101",
    "jobTitle": "Senior Sales Representative",
    "department": "Field Sales",
    "territoryCode": "PP-NORTH",
    "depotCode": "DEPOT-PP01",
    "avatarUrl": null,
    "preferredLanguage": "km-KH",
    "timeZoneId": "Asia/Phnom_Penh",
    "isActive": true,
    "isLockedOut": false,
    "lockoutEnd": null,
    "roles": [
      "Sales Representative"
    ],
    "permissions": [
      "visits.read",
      "visits.create",
      "orders.read",
      "orders.create",
      "customers.read"
    ],
    "lastLoginAt": "2026-08-20T08:30:00+07:00",
    "lastLoginIp": "192.168.1.50",
    "createdAt": "2026-08-10T09:15:00+07:00",
    "createdBy": "admin@isigroup.com.kh",
    "updatedAt": "2026-08-15T11:20:00+07:00",
    "updatedBy": "admin@isigroup.com.kh"
  },
  "meta": {
    "correlationId": "0HN8F1K2:00000002",
    "timestamp": "2026-08-21T16:00:00.000Z"
  }
}
```

---

### 3.3 Create User Account

`POST /api/v1/users`

#### Request Body
```json
{
  "fullName": "Sok Visal",
  "email": "visal.sok@isigroup.com.kh",
  "phoneNumber": "012345999",
  "password": "SecureInitialPassword123!",
  "employeeCode": "EMP000250",
  "jobTitle": "Field Sales Representative",
  "department": "Field Sales",
  "territoryCode": "PP-SOUTH",
  "depotCode": "DEPOT-PP02",
  "preferredLanguage": "km-KH",
  "timeZoneId": "Asia/Phnom_Penh",
  "roles": [
    "Sales Representative"
  ],
  "isActive": true
}
```

#### Response (`201 Created`)
Headers: `Location: /api/v1/users/019240aa-bbbb-7000-8000-000000000001`
Body: Wrapped `UserDetailsResponse`.

---

### 3.4 Update User Account & Roles

`PUT /api/v1/users/{userId}`

```json
{
  "fullName": "Sok Visal",
  "phoneNumber": "012345999",
  "employeeCode": "EMP000250",
  "jobTitle": "Sales Supervisor",
  "department": "Field Sales",
  "territoryCode": "PP-SOUTH",
  "depotCode": "DEPOT-PP02",
  "preferredLanguage": "km-KH",
  "timeZoneId": "Asia/Phnom_Penh",
  "roles": [
    "Supervisor"
  ],
  "isActive": true
}
```

#### Response (`200 OK`)
Body: Updated `UserDetailsResponse`.

---

### 3.5 Activate / Deactivate User

`PATCH /api/v1/users/{userId}/status`

```json
{
  "isActive": false
}
```

#### Response (`204 No Content`)
> [!NOTE]
> Deactivating a user immediately revokes all active device sessions and rolls the user's security stamp, terminating ongoing access across mobile and web clients.

---

### 3.6 Unlock User Account

`POST /api/v1/users/{userId}/unlock`

Clears failed sign-in access attempts and removes the account lockout penalty.

#### Response (`204 No Content`)

---

### 3.7 Admin Reset Password

`POST /api/v1/users/{userId}/reset-password`

```json
{
  "newPassword": "NewStrongPassword456!"
}
```

#### Response (`204 No Content`)

---

### 3.8 Delete User Account (Soft Delete)

`DELETE /api/v1/users/{userId}`

Soft-deletes the user (`isDeleted = true`). Referential links to historical orders, visits, and audits remain intact.

#### Response (`204 No Content`)

---

### 3.9 Revoke User Sessions

`POST /api/v1/users/{userId}/sessions/revoke`

Forces immediate sign-out on every device the user is currently signed in on.

#### Response (`204 No Content`)

---

### 3.10 Bulk Delete User Accounts

`POST /api/v1/users/bulk-delete`

Soft-deletes several accounts in one request. The portal's "select rows, delete" action
uses this instead of issuing one `DELETE` per row.

```json
{
  "userIds": [
    "01923f81-7d12-7000-8000-000000000001",
    "01923f81-7d12-7000-8000-000000000002"
  ]
}
```

At most **200** identifiers per request; duplicates are collapsed before processing.

#### Response (`200 OK`)

```json
{
  "data": {
    "requestedCount": 3,
    "deletedCount": 2,
    "deleted": [
      "01923f81-7d12-7000-8000-000000000001",
      "01923f81-7d12-7000-8000-000000000002"
    ],
    "failed": [
      {
        "userId": "01923f81-7d12-7000-8000-000000000009",
        "errorCode": "User.CannotDeleteSelf",
        "reason": "You cannot delete your own account."
      }
    ]
  },
  "meta": {
    "correlationId": "0HN8F1K2:00000006",
    "timestamp": "2026-09-17T03:00:00.000Z"
  }
}
```

> [!IMPORTANT]
> **Partial success answers `200`, not an error.** Each account is judged against
> exactly the same rules as `DELETE /api/v1/users/{userId}` — self-protection, the last
> administrator guard, and existence — and is committed on its own. One refusal does not
> roll back the others, so the portal must read `failed` and report it rather than
> treating `200` as "all removed". A request where every account failed still answers
> `200`; `deletedCount` is the number to check.

Each removed account emits its own `UserChanged` event (see
[section 6](#6-real-time-updates-signalr)).

---

### 3.11 List Departments

`GET /api/v1/departments`

Populates the department field on the create- and edit-user forms.

#### Response (`200 OK`)

```json
{
  "data": [
    { "name": "Administration", "userCount": 3 },
    { "name": "Field Sales", "userCount": 45 }
  ],
  "meta": {
    "correlationId": "0HN8F1K2:00000007",
    "timestamp": "2026-09-17T03:00:00.000Z"
  }
}
```

> [!NOTE]
> **This list is derived from the accounts themselves, not from a departments table.**
> The platform stores `department` as a free string on the user — which is what the SAP
> personnel extract supplies — so a department with no users is not in the list.
> Render it as a suggestion list (a combo box) rather than a closed dropdown, or a new
> team can never be assigned its first member. `userCount` is supplied so the form can
> order by what is actually in use.

Unpaged: the result is one row per distinct department across the whole directory.

---

## 4. Role & Permission Management APIs

### 4.1 List Roles

`GET /api/v1/roles`

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "01923f80-0000-7000-8000-000000000001",
      "name": "Administrator",
      "description": "Full access to all system features and configuration.",
      "isSystem": true,
      "userCount": 2,
      "permissions": [
        "users.read",
        "users.create",
        "users.update",
        "users.deactivate",
        "roles.read",
        "roles.manage",
        "permissions.read",
        "permissions.manage",
        "customers.read",
        "customers.create",
        "orders.read",
        "orders.create",
        "orders.approve"
      ]
    },
    {
      "id": "01923f80-0000-7000-8000-000000000002",
      "name": "Sales Representative",
      "description": "Field sales activities, customer visits, and order capture.",
      "isSystem": false,
      "userCount": 45,
      "permissions": [
        "customers.read",
        "customers.create",
        "visits.read",
        "visits.create",
        "orders.read",
        "orders.create"
      ]
    }
  ],
  "meta": {
    "correlationId": "0HN8F1K2:00000003",
    "timestamp": "2026-08-21T16:00:00.000Z"
  }
}
```

---

### 4.2 Create Role

`POST /api/v1/roles`

```json
{
  "name": "Regional Auditor",
  "description": "Read-only audit and analytics access for regional compliance officers.",
  "permissions": [
    "users.read",
    "customers.read",
    "customers.readall",
    "orders.read",
    "orders.readall",
    "reports.read",
    "reports.export",
    "audit.read"
  ]
}
```

#### Response (`201 Created`)
Headers: `Location: /api/v1/roles/{roleId}`
Body: Wrapped `RoleResponse`.

---

### 4.3 Update Role

`PUT /api/v1/roles/{roleId}`

```json
{
  "name": "Regional Compliance Officer",
  "description": "Updated title and description for compliance inspectors."
}
```

#### Response (`200 OK`)
Body: Updated `RoleResponse`.

---

### 4.4 Delete Role

`DELETE /api/v1/roles/{roleId}`

#### Response (`204 No Content`)
> [!WARNING]
> System roles (`isSystem: true`) and roles with active assigned users (`userCount > 0`) cannot be deleted. Reassign users before attempting to delete a role.

---

### 4.5 Set Role Permissions

`PUT /api/v1/roles/{roleId}/permissions`

Atomically replaces the complete grant set on the target role.

```json
{
  "permissions": [
    "customers.read",
    "customers.create",
    "orders.read",
    "orders.create",
    "orders.approve"
  ]
}
```

#### Response (`204 No Content`)

---

### 4.6 List Available Permissions by Module

`GET /api/v1/permissions`

Used to render permission selection matrices and role editors in the Admin UI.

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "module": "Identity",
      "permissions": [
        {
          "id": "01923f70-0000-7000-8000-000000000001",
          "name": "users.read",
          "module": "Identity",
          "displayName": "View users",
          "description": "View the user directory and user detail.",
          "isSystem": true
        },
        {
          "id": "01923f70-0000-7000-8000-000000000002",
          "name": "users.create",
          "module": "Identity",
          "displayName": "Create users",
          "description": "Invite or create new user accounts.",
          "isSystem": true
        },
        {
          "id": "01923f70-0000-7000-8000-000000000003",
          "name": "users.update",
          "module": "Identity",
          "displayName": "Edit users",
          "description": "Change user profile details and assignments.",
          "isSystem": true
        }
      ]
    },
    {
      "module": "Orders",
      "permissions": [
        {
          "id": "01923f70-0000-7000-8000-000000000010",
          "name": "orders.read",
          "module": "Orders",
          "displayName": "View orders",
          "description": "View own created orders.",
          "isSystem": false
        },
        {
          "id": "01923f70-0000-7000-8000-000000000011",
          "name": "orders.approve",
          "module": "Orders",
          "displayName": "Approve orders",
          "description": "Approve orders exceeding field threshold limits.",
          "isSystem": false
        }
      ]
    }
  ],
  "meta": {
    "correlationId": "0HN8F1K2:00000004",
    "timestamp": "2026-08-21T16:00:00.000Z"
  }
}
```

---

## 5. Error Handling & Error Codes

All errors follow the RFC 9457 standard. Applications should match against `errorCode` to display localized error feedback.

```json
{
  "type": "https://docs.isigroup.com.kh/errors/User.EmailAlreadyExists",
  "title": "A conflict occurred.",
  "status": 409,
  "detail": "A user with this e-mail address already exists.",
  "instance": "/api/v1/users",
  "errorCode": "User.EmailAlreadyExists",
  "correlationId": "0HN8F1K2:00000005"
}
```

### Complete Error Matrix

| Error Code | HTTP Status | Meaning | Recommended UI Action |
|---|---|---|---|
| `User.NotFound` | 404 | Target user ID not found or soft-deleted | Show "User not found" and redirect to list |
| `User.EmailAlreadyExists` | 409 | Email address already taken | Highlight email field with duplicate warning |
| `User.EmployeeCodeAlreadyExists` | 409 | Employee code already assigned | Highlight employee code input |
| `User.PhoneNumberAlreadyExists` | 409 | Phone number already in use by another undeleted account | Highlight phone number input |
| `User.CannotDeactivateSelf` | 400 | Administrator attempting to deactivate own account | Disable self-deactivation button / alert admin |
| `User.CannotDeleteSelf` | 400 | Administrator attempting to delete own account | Disable self-delete button |
| `User.CannotModifySystemAdmin` | 409 | Deactivating or deleting the last *enabled* `Administrator` | Block the action and tell the administrator to grant the role to somebody else first |
| `Role.NotFound` | 404 | Role ID does not exist | Show "Role not found" and redirect |
| `Role.DuplicateName` | 409 | Role name already exists | Highlight role name input |
| `Role.SystemImmutable` | 409 | Attempted to rename or delete a system role | Disable edit/delete on system roles |
| `Role.HasAssignedUsers` | 409 | Attempted to delete role with users assigned | Prompt administrator to reassign users first |
| `Role.UnknownPermissions` | 400 | Specified permission key does not exist in catalog | Check permission matrix selection |
| `General.Validation` | 400 | Payload failed schema validation | Display field-specific validation errors |

---

## 6. Real-Time Updates (SignalR)

The administration screens stay current without polling and without a page refresh. The
REST endpoints above remain the source of truth; the hub delivers what changed after the
page was loaded.

### 6.1 Connecting

| | |
|---|---|
| **Hub URL** | `/hubs/admin/user-management` (outside `/api`, unversioned) |
| **Transport auth** | `Authorization: Bearer <access_token>`, or `?access_token=` for the browser WebSocket handshake, which cannot set a header |
| **Required permission** | `users.read`, checked once at the handshake |
| **Group** | `admin:user-management` — joined automatically on connect |

There is no subscribe method to call. A caller either holds `users.read` and receives
every administration event, or is refused the connection. The user directory is not
partitioned per administrator, so there is nothing to subscribe to.

```ts
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
  .withUrl(`${apiBaseUrl}/hubs/admin/user-management`, {
    accessTokenFactory: () => auth.accessToken,   // re-read on every reconnect
  })
  .withAutomaticReconnect()
  .build();
```

> [!IMPORTANT]
> `accessTokenFactory` must read the **current** token, not close over one. Access tokens
> live 15 minutes; a reconnect after that with a captured token is refused and the
> screen silently stops updating.

### 6.2 Events

| Event | Payload | Raised when | Received by |
|---|---|---|---|
| `UserChanged` | `UserChangedEvent` | A user is created, updated, activated/deactivated, unlocked, password-reset, has sessions revoked, or is deleted | Every connection holding `users.read` |
| `RoleChanged` | `RoleChangedEvent` | A role is created, renamed/re-described, re-permissioned, or deleted | Every connection holding `users.read` |

```ts
export type UserChangeKind =
  | 'Created' | 'Updated' | 'StatusChanged' | 'Unlocked'
  | 'SessionsRevoked' | 'PasswordReset' | 'Removed';

export interface UserChangedEvent {
  kind: UserChangeKind;
  userId: string;
  user: UserListItem | null;   // null only when kind === 'Removed'
  occurredAt: string;          // ISO 8601
}

export type RoleChangeKind = 'Created' | 'Updated' | 'PermissionsChanged' | 'Removed';

export interface RoleChangedEvent {
  kind: RoleChangeKind;
  roleId: string;
  role: RoleItem | null;       // null only when kind === 'Removed'
  occurredAt: string;
}
```

**Two events rather than one per action.** A new administrator action must not be a
breaking change for a browser bundle that does not know its name, and every handler
would have ended in the same "upsert this row" call anyway. The `kind` travels inside
the payload, where an unrecognised value is survivable.

### 6.3 Reconciling with local state

Each event carries the **complete** row after the change, not a patch. That is what makes
applying it idempotent — the same event twice is a no-op — and it is why a row created
while the administrator was looking at page three needs no local state to merge into.

```ts
connection.on('UserChanged', (event: UserChangedEvent) => {
  // Discard anything older than what is already applied for this id. Protects against
  // a duplicate delivery and against an event that overtakes the REST response it raced.
  const applied = lastAppliedAt.get(event.userId);
  if (applied && event.occurredAt <= applied) return;
  lastAppliedAt.set(event.userId, event.occurredAt);

  if (event.kind === 'Removed') {
    removeRow(event.userId);
    return;
  }

  upsertRow(event.user!);   // present for every kind except 'Removed'
});
```

| Situation | What the portal must do |
|---|---|
| Initial load | Fetch the page over REST **first**, then connect. Connecting first shows an empty table until something happens to change. |
| Duplicate event | Dropped by the `occurredAt` comparison above. |
| Event for a row not on the current page | Ignore it, or increment the total — do not insert a row the current filter and sort did not select. |
| Filtered list | An update can move a row out of the active filter (deactivating a user while "Active" is selected). Re-evaluate the filter on upsert rather than leaving a stale row. |
| Reconnect | **Re-fetch the current page before trusting events again.** There is no replay buffer; anything that fired while disconnected is gone. Use `connection.onreconnected`. |
| Permission revoked mid-session | The open socket survives until it drops, bounded by the 15-minute access-token lifetime. Deactivating or deleting a user revokes their sessions, which closes it sooner. |

> [!NOTE]
> **Delivery is best-effort and never fails the write.** The database change is committed
> before the event is published, and a transport fault is logged rather than turned into
> a 500 on a `PUT` that succeeded. A missed event costs one stale row until the next
> refresh — which is why the reconnect rule above matters.

---

## 7. Frontend Integration Patterns (TypeScript / React)

### 7.1 TypeScript Interface Definitions

```typescript
export interface UserListItem {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  employeeCode: string | null;
  jobTitle: string | null;
  department: string | null;
  territoryCode: string | null;
  depotCode: string | null;
  isActive: boolean;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserDetails extends UserListItem {
  emailConfirmed: boolean;
  phoneNumberConfirmed: boolean;
  avatarUrl: string | null;
  preferredLanguage: string | null;
  timeZoneId: string | null;
  isLockedOut: boolean;
  lockoutEnd: string | null;
  permissions: string[];
  lastLoginIp: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export interface PermissionDefinition {
  id: string;
  name: string;
  module: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
}

export interface PermissionModuleGroup {
  module: string;
  permissions: PermissionDefinition[];
}

export interface Department {
  name: string;
  userCount: number;
}

export interface BulkDeleteUserFailure {
  userId: string;
  errorCode: string;
  reason: string;
}

export interface BulkDeleteUsersResult {
  requestedCount: number;
  deletedCount: number;
  deleted: string[];
  failed: BulkDeleteUserFailure[];
}
```

### 7.2 API Client Methods (Axios / Fetch)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.isigroup.com.kh/api/v1',
});

// Interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const UserManagementApi = {
  // Users
  getUsers: (params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    role?: string;
    department?: string;
    territoryCode?: string;
    sort?: string;
  }) => api.get<{ data: UserListItem[]; meta: any }>('/users', { params }),

  getUserById: (userId: string) => api.get<{ data: UserDetails }>(`/users/${userId}`),

  createUser: (data: any) => api.post<{ data: UserDetails }>('/users', data),

  updateUser: (userId: string, data: any) => api.put<{ data: UserDetails }>(`/users/${userId}`, data),

  setUserStatus: (userId: string, isActive: boolean) =>
    api.patch(`/users/${userId}/status`, { isActive }),

  unlockUser: (userId: string) => api.post(`/users/${userId}/unlock`),

  adminResetPassword: (userId: string, newPassword: string) =>
    api.post(`/users/${userId}/reset-password`, { newPassword }),

  deleteUser: (userId: string) => api.delete(`/users/${userId}`),

  revokeSessions: (userId: string) => api.post(`/users/${userId}/sessions/revoke`),

  // Answers 200 even when some accounts were refused - read `failed`, do not assume
  // the whole selection was removed.
  bulkDeleteUsers: (userIds: string[]) =>
    api.post<{ data: BulkDeleteUsersResult }>('/users/bulk-delete', { userIds }),

  getDepartments: () => api.get<{ data: Department[] }>('/departments'),

  // Roles & Permissions
  getRoles: () => api.get<{ data: RoleItem[] }>('/roles'),

  getRoleById: (roleId: string) => api.get<{ data: RoleItem }>(`/roles/${roleId}`),

  createRole: (data: { name: string; description?: string; permissions?: string[] }) =>
    api.post<{ data: RoleItem }>('/roles', data),

  updateRole: (roleId: string, data: { name: string; description?: string }) =>
    api.put<{ data: RoleItem }>(`/roles/${roleId}`, data),

  deleteRole: (roleId: string) => api.delete(`/roles/${roleId}`),

  setRolePermissions: (roleId: string, permissions: string[]) =>
    api.put(`/roles/${roleId}/permissions`, { permissions }),

  getPermissions: () => api.get<{ data: PermissionModuleGroup[] }>('/permissions'),
};
```
