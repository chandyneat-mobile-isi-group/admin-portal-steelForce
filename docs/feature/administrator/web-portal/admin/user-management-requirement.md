# User Management Backend Requirements

## 1. Overview
This document specifies the backend requirements to fully support the User Management UI in the Admin Web Portal. It outlines the necessary APIs, request/response models, database entities, and business rules derived from the existing frontend implementation.

## 2. Current UI Analysis
The Admin Web Portal provides a comprehensive User Management interface located under `src/app/(portal)/user-management/users`. The UI includes:
- **User List:** A table displaying users with search functionality, status filtering (All, Active, Disabled, Locked), and pagination.
- **Bulk Actions:** Ability to select multiple users and perform bulk deletion.
- **User Details:** A read-only profile page showing personal, company, and system information, along with effective permissions mapped from the user's role.
- **Create User:** A multi-step wizard to create a new user (General Info, Company Info, Security/Password).
- **Edit User:** A modal to update a user's profile information.
- **Account Actions:** Inline and detail-page actions to toggle status (enable/disable), unlock account, reset password, revoke sessions, and delete the user.

## 3. User Management Workflow
1. **Creation:** An administrator creates a user, assigning them a role, department, and optionally territory/depot codes. A temporary password is provided, and the user can be forced to reset it upon first login.
2. **Access Control:** The user's role defines their permissions (e.g., `users.read`, `orders.write`).
3. **Lifecycle:** Administrators can temporarily disable users (preventing login), unlock users who are locked out due to failed attempts, revoke active sessions if compromised, and reset forgotten passwords.
4. **Deletion:** Users can be deleted (or soft-deleted) individually or in bulk.

## 4. Roles & Permissions
- **Roles:** The system distinguishes between "System Roles" (immutable names/deletion) and "Custom Roles". 
- **Permissions Matrix:** Permissions are managed in a matrix UI (Module x Action). The UI expects an endpoint to fetch available grouped permissions (`GET /api/v1/permissions`) to render this matrix dynamically.
- **Role Assignment:** Users are assigned roles (currently mapped as an array of role names in the frontend, but primarily expects a single role like `Sales Representative`).
- **Data Shape:** The backend needs to return `permissions` in the user and role details response as an array of strings like `['module.action', ...]` which the frontend transforms into a matrix internally.

## 5. Functional Requirements
The backend must implement the following functionalities:
- **CRUD Operations:** List (with pagination, search, filters), Get By ID, Create, Update, Delete (single and bulk).
- **Lifecycle Management:** Toggle Active Status, Unlock Account.
- **Security Actions:** Reset Password, Revoke Active Sessions.
- **Dependency Data:** Provide lists of Roles and Departments.

## 6. API Requirements

| UI Feature | UI Component | Required API | Method | Backend Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| User List | `UsersPage` | `/api/v1/users` | GET | Needs Review | Ensure pagination, search, and status filtering work. |
| User Details | `UserDetailPage` | `/api/v1/users/{id}` | GET | Needs Review | Ensure all fields (including permissions) are returned. |
| Create User | `CreateUserPage` | `/api/v1/users` | POST | Needs Review | Implement endpoint using `CreateUserPayload`. |
| Update User | `Edit Profile Modal` | `/api/v1/users/{id}` | PUT | Needs Review | Implement endpoint using `UpdateUserPayload`. |
| Delete User | `DeleteConfirm` | `/api/v1/users/{id}` | DELETE | Needs Review | Implement soft/hard delete. |
| Toggle Status | `handleToggleStatus`| `/api/v1/users/{id}/status` | PATCH | Needs Review | Implement `{ isActive: boolean }` payload. |
| Unlock User | `handleUnlock` | `/api/v1/users/{id}/unlock` | POST | Needs Review | Implement unlock logic (clear lockout). |
| Reset Password| `ResetPwdModal` | `/api/v1/users/{id}/reset-password` | POST | Needs Review | Implement `{ newPassword: string }` payload. |
| Revoke Session| `RevokeConfirm` | `/api/v1/users/{id}/sessions/revoke`| POST | Needs Review | Clear active tokens for the user. |
| List Roles | `RolesPage` | `/api/v1/roles` | GET | Needs Review | Return all roles with user counts. |
| Get Role | `RolesPage` | `/api/v1/roles/{id}` | GET | Needs Review | Return single role details. |
| Create Role | `RolesPage` | `/api/v1/roles` | POST | Needs Review | Implement `{ name, description }` payload. |
| Update Role | `RolesPage` | `/api/v1/roles/{id}` | PUT | Needs Review | Implement `{ name, description }` payload. |
| Delete Role | `RolesPage` | `/api/v1/roles/{id}` | DELETE | Needs Review | Delete role (prevent if system role). |
| List Perms | `PermissionsPage` | `/api/v1/permissions` | GET | Needs Review | Return available permission modules. |
| Update Perms| `PermissionsPage` | `/api/v1/roles/{id}/permissions` | PUT | Needs Review | Implement `{ permissions: string[] }` payload. |
| List Depts | `CreateUserPage` | `/api/v1/departments` | GET | Needs Review | Return departments for dropdown. |

## 7. Request & Response Models

### 7.1. Shared Response Envelope
All APIs should return data wrapped in an envelope:
```json
{
  "data": { ... },
  "meta": {
    "correlationId": "sf-...",
    "pagination": {
      "pageNumber": 1,
      "pageSize": 25,
      "totalCount": 100,
      "totalPages": 4,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 7.2. User List Item (Response Data)
Used in `GET /api/v1/users`:
```json
{
  "id": "uuid",
  "fullName": "Chan Dara",
  "email": "dara@example.com",
  "phoneNumber": "012345678",
  "employeeCode": "EMP001",
  "jobTitle": "Sales Rep",
  "department": "Field Sales",
  "territoryCode": "PP-NORTH",
  "depotCode": "DEPOT-PP01",
  "isActive": true,
  "roles": ["Sales Representative"],
  "lastLoginAt": "2023-10-01T12:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### 7.3. User Details (Response Data)
Used in `GET /api/v1/users/{id}` (extends User List Item):
```json
{
  "emailConfirmed": true,
  "phoneNumberConfirmed": false,
  "avatarUrl": null,
  "preferredLanguage": "km-KH",
  "timeZoneId": "Asia/Phnom_Penh",
  "isLockedOut": false,
  "lockoutEnd": null,
  "permissions": ["users.read", "users.write"],
  "lastLoginIp": "192.168.1.1"
}
```

### 7.4. Create User Payload (Request Body)
Used in `POST /api/v1/users`:
```json
{
  "fullName": "Chan Dara",
  "email": "dara@example.com",
  "phoneNumber": "012345678",
  "password": "TemporaryPassword123!",
  "employeeCode": "EMP001",
  "jobTitle": "Senior Sales Representative",
  "department": "Field Sales",
  "territoryCode": "PP-NORTH",
  "depotCode": "DEPOT-PP01",
  "preferredLanguage": "km-KH",
  "timeZoneId": "Asia/Phnom_Penh",
  "roles": ["Sales Representative"],
  "isActive": true
}
```

### 7.5. Update User Payload (Request Body)
Used in `PUT /api/v1/users/{id}`:
```json
{
  "fullName": "Chan Dara",
  "phoneNumber": "012345678",
  "employeeCode": "EMP001",
  "jobTitle": "Senior Sales Representative",
  "department": "Field Sales",
  "territoryCode": "PP-NORTH",
  "depotCode": "DEPOT-PP01",
  "preferredLanguage": "km-KH",
  "timeZoneId": "Asia/Phnom_Penh",
  "roles": ["Sales Representative"],
  "isActive": true
}
```

### 7.6. Role Item (Response Data)
Used in `GET /api/v1/roles` and `GET /api/v1/roles/{id}`:
```json
{
  "id": "uuid",
  "name": "Sales Representative",
  "description": "Field sales agent",
  "isSystem": false,
  "userCount": 42,
  "permissions": ["users.read", "orders.create", "orders.read"]
}
```

### 7.7. Create/Update Role Payload (Request Body)
Used in `POST /api/v1/roles` and `PUT /api/v1/roles/{id}`:
```json
{
  "name": "Regional Manager",
  "description": "Manages a specific territory"
}
```

### 7.8. Permission Module Group (Response Data)
Used in `GET /api/v1/permissions`:
```json
[
  {
    "module": "users",
    "permissions": [
      { "id": "uuid", "name": "users.view", "module": "users", "displayName": "View Users", "description": null, "isSystem": true },
      { "id": "uuid", "name": "users.create", "module": "users", "displayName": "Create Users", "description": null, "isSystem": true }
    ]
  }
]
```

### 7.9. Update Permissions Payload (Request Body)
Used in `PUT /api/v1/roles/{id}/permissions`:
```json
{
  "permissions": [
    "users.view",
    "users.create",
    "orders.manage"
  ]
}
```

## 8. Database Requirements
The backend database (e.g., PostgreSQL) must store the following entities and relationships:

**Users Table:**
- `id` (UUID, PK)
- `full_name` (String)
- `email` (String, Unique)
- `phone_number` (String)
- `password_hash` (String)
- `employee_code` (String, Unique)
- `job_title` (String)
- `department_id` (FK to Departments, nullable)
- `territory_code` (String)
- `depot_code` (String)
- `preferred_language` (String, default 'km-KH')
- `time_zone_id` (String, default 'Asia/Phnom_Penh')
- `is_active` (Boolean, default true)
- `is_locked_out` (Boolean, default false)
- `lockout_end` (Timestamp, nullable)
- `failed_login_attempts` (Integer, default 0)
- `force_password_reset` (Boolean, default false)
- `last_login_at` (Timestamp, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `deleted_at` (Timestamp, for soft deletes)

**Roles & Permissions:**
- User-to-Role mapping (Many-to-Many or Many-to-One depending on architecture, UI sends an array of strings).
- Role-to-Permission mapping to resolve effective permissions.

## 9. Validation & Business Rules
- **Email/Employee Code:** Must be unique across all users.
- **Passwords:** Must meet complexity requirements (e.g., min 8 chars, mix of case, number, special char).
- **Deletion:** Cannot delete the last remaining System Administrator. Suggest using soft deletes (`deleted_at`).
- **Account Lockout:** After X consecutive failed login attempts, set `isLockedOut = true` and `lockoutEnd = [time]`.

## 10. Authentication & Authorization
- **Authentication:** All `/api/v1/users/*` endpoints require a valid Bearer token.
- **Authorization:** Only users with `users.manage` or `admin` permissions can access these endpoints.
- **Self-Service:** A user might have limited access to `GET /api/v1/users/{self}` or `PUT` to update their own profile.

## 11. Pagination, Search, Filter & Sort
For `GET /api/v1/users`:
- **Pagination:** Query params `pageNumber` (default 1) and `pageSize` (default 25).
- **Search:** Query param `search`. Should perform ILIKE/partial match on `fullName`, `email`, and `employeeCode`.
- **Filter:** Query param `isActive` (boolean). If omitted, return both. The UI sends `isActive=true` for Active, `isActive=false` for Disabled, and omits it for All/Locked. If UI sends `accountStatus`, the backend should map it appropriately.
- **Sort:** Query param `sort` (default `-createdAt`).

## 12. Audit & Logging
- **Action Logging:** Track who created, updated, or deleted users.
- **Security Logging:** Log password resets, account lockouts, and session revocations in an audit table.
