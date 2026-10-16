import * as store from '@/features/users/data/mock-store';
import { sapSalesEmployees } from '@/features/users/data/sales-employees';
import { ApiError } from '@/domain/errors/api-error';
import type {
  AppUser,
  AppUserWithRelations,
  Department,
  PermissionModuleGroup,
  Role,
} from '@/domain/entities/user';
import type { PageResult } from '@/infrastructure/repositories/types';
import { mockDelay, paginate } from '@/services/mock';
import type {
  AuditRepository,
  CreateRolePayload,
  CreateUserInput,
  DepartmentInput,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  SalesEmployeeOption,
  UpdateProfilePayload,
  UpdateRolePayload,
  UpdateUserInput,
  UserListQuery,
  UserRepository,
} from './types';
import { REPRESENTATIVE_ROLE } from '../sales-employee-link';

/**
 * Local repositories over the prototype's persistent store. They accept both input
 * shapes the pages send — the camelCase API payload (`fullName`, `roles`) and the
 * snake_case entity (`full_name`, `role_id`) — and resolve role and department names to
 * their records, so every screen reads back exactly what another one wrote.
 */

function page<T>(items: T[]): PageResult<T> {
  return { items, total: items.length, nextCursor: null };
}

type Loose = Record<string, unknown>;

/** The first key present on `input` (null counts — it means "clear"), else undefined. */
function field<T = string | null>(input: Loose, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (input[key] !== undefined) return input[key] as T;
  }
  return undefined;
}

const blankToNull = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null || value.trim() === '' ? null : value.trim();

function roleIdFrom(input: Loose): string | null | undefined {
  const roles = input.roles;
  const value = Array.isArray(roles) ? (roles[0] as string | undefined) ?? null : field(input, 'role_id', 'roleId');
  if (value === undefined) return undefined;
  if (value === null) return null;
  const id = store.resolveRoleId(value);
  if (!id) throw new ApiError(404, 'not_found', 'api.error.role.notFound', { code: 'Role.NotFound' });
  return id;
}

function departmentIdFrom(input: Loose): string | null | undefined {
  const value = field(input, 'department', 'department_id', 'departmentId');
  return value === undefined ? undefined : store.resolveDepartmentId(value);
}

function statusFrom(input: Loose): string | undefined {
  if (typeof input.isActive === 'boolean') return input.isActive ? 'active' : 'disabled';
  return field<string>(input, 'account_status') ?? undefined;
}

/**
 * Shrinks an uploaded picture to a 256px square data URL, so the avatar survives a
 * reload (an object URL would not) without filling localStorage.
 */
function avatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const source = String(reader.result);
      const img = new Image();
      img.onerror = () => resolve(source);
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(source);
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = source;
    };
    reader.readAsDataURL(file);
  });
}

export class MockUserRepository implements UserRepository {
  async list(query: UserListQuery = {}, signal?: AbortSignal): Promise<PageResult<AppUserWithRelations>> {
    const term = query.search?.trim().toLocaleLowerCase();
    const roleId = query.roleId ?? (query.role ? store.resolveRoleId(query.role) ?? query.role : undefined);
    const departmentId = query.departmentId ?? (query.department ? store.resolveDepartmentId(query.department) : undefined);

    const rows = (await store.fetchUsers(signal)).filter((user) => {
      // `accountStatus` is the precise filter; `isActive` only applies on its own.
      if (query.accountStatus) {
        if (user.account_status !== query.accountStatus) return false;
      } else if (query.isActive !== undefined && (user.account_status === 'active') !== query.isActive) {
        return false;
      }
      if (departmentId && user.department_id !== departmentId) return false;
      if (roleId && user.role_id !== roleId) return false;
      if (query.territoryCode && (user as store.UserRecord).territory_code !== query.territoryCode) return false;
      if (!term) return true;
      return [user.full_name, user.username, user.employee_id, user.email, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(term));
    });

    if (query.sort === 'name') rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
    const size = query.pageSize ?? query.limit ?? (rows.length || 1);
    const result = paginate(rows, query.pageNumber ?? query.page ?? 1, size);
    return { items: result.items, total: result.total, nextCursor: result.page < result.totalPages ? String(result.page + 1) : null };
  }

  getById(id: string, signal?: AbortSignal): Promise<AppUserWithRelations | null> {
    return store.fetchUserById(id, signal);
  }

  async create(input: CreateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const inp = input as Loose;
    return store.createUser(
      {
        full_name: field<string>(inp, 'fullName', 'full_name') ?? '',
        email: blankToNull(field(inp, 'email')) ?? null,
        username: field<string>(inp, 'username') ?? undefined,
        phone: blankToNull(field(inp, 'phoneNumber', 'phone')) ?? null,
        employee_id: blankToNull(field(inp, 'employeeCode', 'employee_id')) ?? null,
        position: blankToNull(field(inp, 'jobTitle', 'position')) ?? null,
        department_id: departmentIdFrom(inp) ?? null,
        address: blankToNull(field(inp, 'address')) ?? null,
        territory_code: blankToNull(field(inp, 'territoryCode', 'territory_code')) ?? null,
        depot_code: blankToNull(field(inp, 'depotCode', 'depot_code')) ?? null,
        preferred_language: field(inp, 'preferredLanguage') ?? undefined,
        time_zone_id: field(inp, 'timeZoneId') ?? undefined,
        role_id: roleIdFrom(inp) ?? null,
        temp_password: field(inp, 'password', 'temp_password') ?? null,
        avatar_url: blankToNull(field(inp, 'avatarUrl', 'avatar_url')) ?? null,
        account_status: statusFrom(inp) ?? 'active',
        employment_status: field<string>(inp, 'employment_status') ?? 'Active',
      },
      signal
    );
  }

  /**
   * Only the fields present are changed. The user detail screen edits the postal
   * address under `territoryCode` (it fills that field from `address`), so on update
   * `territoryCode` writes the address; on create it is the sales territory.
   */
  async update(id: string, input: UpdateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations> {
    const inp = input as Loose;
    return store.updateUser(
      id,
      {
        full_name: field<string>(inp, 'fullName', 'full_name')?.trim() || undefined,
        phone: blankToNull(field(inp, 'phoneNumber', 'phone')),
        employee_id: blankToNull(field(inp, 'employeeCode', 'employee_id')),
        position: blankToNull(field(inp, 'jobTitle', 'position')),
        department_id: departmentIdFrom(inp),
        address: blankToNull(field(inp, 'territoryCode', 'address')),
        depot_code: blankToNull(field(inp, 'depotCode', 'depot_code')),
        role_id: roleIdFrom(inp),
        account_status: statusFrom(inp),
        avatar_url: blankToNull(field(inp, 'avatarUrl', 'avatar_url')),
      },
      signal
    );
  }

  async updateMyProfile(payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUser> {
    return this.updateUserProfile(store.CURRENT_USER_ID, payload, signal);
  }

  async updateUserProfile(id: string, payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUserWithRelations> {
    let avatar: string | null | undefined = payload.avatarUrl;
    if (payload.removeAvatar) avatar = null;
    else if (payload.avatar) avatar = await avatarDataUrl(payload.avatar);

    return store.updateUser(
      id,
      {
        full_name: payload.fullName?.trim() || undefined,
        position: payload.jobTitle === undefined ? undefined : blankToNull(payload.jobTitle),
        phone: payload.phoneNumber === undefined ? undefined : blankToNull(payload.phoneNumber),
        address: payload.address === undefined ? undefined : blankToNull(payload.address),
        preferred_language: payload.preferredLanguage ?? undefined,
        time_zone_id: payload.timeZoneId ?? undefined,
        avatar_url: avatar,
      },
      signal,
      'Profile Updated'
    );
  }

  delete(id: string, signal?: AbortSignal): Promise<void> {
    return store.deleteUsers([id], signal);
  }

  deleteMany(ids: string[], signal?: AbortSignal): Promise<void> {
    return store.deleteUsers(ids, signal);
  }

  setStatus(id: string, isActiveOrStatus: boolean | string, signal?: AbortSignal): Promise<void> {
    const status = typeof isActiveOrStatus === 'boolean' ? (isActiveOrStatus ? 'active' : 'disabled') : isActiveOrStatus;
    return store.setUserStatus(id, status, signal);
  }

  unlock(id: string, signal?: AbortSignal): Promise<void> {
    return store.unlockUser(id, signal);
  }

  resetPassword(id: string, newPassword: string, signal?: AbortSignal): Promise<void> {
    return store.resetUserPassword(id, newPassword, signal);
  }

  revokeSessions(id: string, signal?: AbortSignal): Promise<void> {
    return store.revokeUserSessions(id, signal);
  }

  directory(signal?: AbortSignal): Promise<Record<string, AppUser>> {
    return store.fetchUserDirectory(signal);
  }

  async searchSalesEmployees(search: string, signal?: AbortSignal, limit = 50): Promise<SalesEmployeeOption[]> {
    await mockDelay(160, signal);
    const term = search.trim().toLowerCase();
    return sapSalesEmployees()
      .filter((e) => e.isActive && (!term || e.personnelNumber.includes(term) || (e.fullName ?? '').toLowerCase().includes(term)))
      .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''))
      .slice(0, Math.min(50, Math.max(1, limit)))
      .map((e) => ({ personnelNumber: e.personnelNumber, fullName: e.fullName }));
  }

  createRepresentative(input: CreateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations> {
    return this.create({ ...(input as object), roles: [REPRESENTATIVE_ROLE] } as CreateUserInput, signal);
  }
}

export class MockDepartmentRepository implements DepartmentRepository {
  async list(signal?: AbortSignal): Promise<PageResult<Department>> {
    return page(await store.fetchDepartments(signal));
  }

  create(input: DepartmentInput, signal?: AbortSignal): Promise<Department> {
    return store.createDepartment(input, signal);
  }

  update(id: string, input: DepartmentInput, signal?: AbortSignal): Promise<void> {
    return store.updateDepartment(id, input, signal);
  }

  delete(id: string, signal?: AbortSignal): Promise<void> {
    return store.deleteDepartment(id, signal);
  }

  userCounts(signal?: AbortSignal): Promise<Record<string, number>> {
    return store.fetchUserCountsByDepartment(signal);
  }
}

/** `["orders.view", …]` → `{ orders: ["view"] }`. */
function toMatrix(permissions: Record<string, string[]> | string[]): Record<string, string[]> {
  if (!Array.isArray(permissions)) return permissions;
  return permissions.reduce<Record<string, string[]>>((acc, name) => {
    const [module, ...rest] = name.split('.');
    if (module && rest.length) (acc[module] ??= []).push(rest.join('.'));
    return acc;
  }, {});
}

export class MockRoleRepository implements RoleRepository {
  async list(signal?: AbortSignal): Promise<PageResult<Role>> {
    return page(await store.fetchRoles(signal));
  }

  getById(id: string, signal?: AbortSignal): Promise<Role | null> {
    return store.fetchRoleById(id, signal);
  }

  create(input: CreateRolePayload, signal?: AbortSignal): Promise<Role> {
    return store.createRole(
      { name: input.name, description: input.description ?? undefined, permissions: toMatrix(input.permissions ?? []) },
      signal
    );
  }

  updateRole(id: string, input: UpdateRolePayload, signal?: AbortSignal): Promise<Role> {
    return store.updateRole(id, { name: input.name, description: input.description ?? undefined }, signal);
  }

  delete(id: string, signal?: AbortSignal): Promise<void> {
    return store.deleteRole(id, signal);
  }

  updatePermissions(id: string, permissions: Record<string, string[]> | string[], signal?: AbortSignal): Promise<void> {
    return store.updateRolePermissions(id, toMatrix(permissions), signal);
  }

  userCounts(signal?: AbortSignal): Promise<Record<string, number>> {
    return store.fetchUserCountsByRole(signal);
  }
}

export class MockPermissionRepository implements PermissionRepository {
  listGrouped(signal?: AbortSignal): Promise<PermissionModuleGroup[]> {
    return store.fetchPermissionGroups(signal);
  }
}

export class MockAuditRepository implements AuditRepository {
  async activityLogs(userId?: string | null, signal?: AbortSignal) {
    return page(await store.fetchActivityLogs(userId, signal));
  }

  async loginHistory(userId?: string | null, signal?: AbortSignal) {
    return page(await store.fetchLoginHistory(userId, signal));
  }

  revokeSession(id: string, signal?: AbortSignal): Promise<void> {
    return store.revokeSession(id, signal);
  }
}
