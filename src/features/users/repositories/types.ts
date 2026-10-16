import type {
  ActivityLog,
  AppUser,
  AppUserWithRelations,
  Department,
  LoginHistoryRecord,
  PermissionModuleGroup,
  Role,
  RoleItem,
} from '@/domain/entities/user';
import type { CrudRepository, ListQuery, PageResult } from '@/infrastructure/repositories/types';

export interface UserListQueryParams extends ListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  role?: string;
  department?: string;
  territoryCode?: string;
  sort?: string;
  accountStatus?: string;
  departmentId?: string;
  roleId?: string;
}

export type UserListQuery = UserListQueryParams;

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  password?: string;
  employeeCode?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  territoryCode?: string | null;
  depotCode?: string | null;
  preferredLanguage?: string | null;
  timeZoneId?: string | null;
  roles: string[];
  isActive?: boolean;
  avatarUrl?: string | null;
}

export interface UpdateUserPayload {
  fullName: string;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  territoryCode?: string | null;
  depotCode?: string | null;
  preferredLanguage?: string | null;
  timeZoneId?: string | null;
  roles: string[];
  isActive?: boolean;
  avatarUrl?: string | null;
}

export interface CreateRolePayload {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface UpdateRolePayload {
  name: string;
  description?: string | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  jobTitle?: string | null;
  preferredLanguage?: string | null;
  timeZoneId?: string | null;
  /** Prototype extras: the profile page edits contact details too. */
  phoneNumber?: string | null;
  address?: string | null;
  avatar?: File | null;
  /** An already-encoded image (data URL) — the profile page's avatar presets. */
  avatarUrl?: string | null;
  removeAvatar?: boolean;
}

export type CreateUserInput = Partial<AppUser> | CreateUserPayload;

/** One current SAP sales employee — the person a Sales Representative account links to. */
export interface SalesEmployeeOption {
  personnelNumber: string;
  fullName: string | null;
}
export type UpdateUserInput = Partial<AppUser> | UpdateUserPayload;

export interface UserRepository
  extends CrudRepository<AppUserWithRelations, CreateUserInput, UpdateUserInput, UserListQuery> {
  /** Account lifecycle transitions the backend owns as distinct endpoints */
  setStatus(id: string, isActiveOrStatus: boolean | string, signal?: AbortSignal): Promise<void>;
  unlock(id: string, signal?: AbortSignal): Promise<void>;
  resetPassword(id: string, newPassword: string, signal?: AbortSignal): Promise<void>;
  revokeSessions(id: string, signal?: AbortSignal): Promise<void>;
  deleteMany(ids: string[], signal?: AbortSignal): Promise<void>;
  updateMyProfile(payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUser>;
  updateUserProfile(id: string, payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AppUserWithRelations>;
  /** id -> user lookup used by log tables */
  directory(signal?: AbortSignal): Promise<Record<string, AppUser>>;
  /**
   * Current SAP sales employees matching a personnel number or name, sorted by name.
   * `GET /users/sales-employees` — needs only `users.read`. At most 50.
   */
  searchSalesEmployees(search: string, signal?: AbortSignal, limit?: number): Promise<SalesEmployeeOption[]>;
  /**
   * Creates a Sales Representative through `POST /users/representatives` — the route a
   * Sales Rep Manager (`users.create_representative`, no `users.create`) may call.
   */
  createRepresentative(input: CreateUserInput, signal?: AbortSignal): Promise<AppUserWithRelations>;
}

export type DepartmentInput = Pick<Department, 'name' | 'description' | 'manager_name'>;

export interface DepartmentRepository {
  list(signal?: AbortSignal): Promise<PageResult<Department>>;
  create(input: DepartmentInput, signal?: AbortSignal): Promise<Department>;
  update(id: string, input: DepartmentInput, signal?: AbortSignal): Promise<void>;
  delete(id: string, signal?: AbortSignal): Promise<void>;
  userCounts(signal?: AbortSignal): Promise<Record<string, number>>;
}

export interface RoleRepository {
  list(signal?: AbortSignal): Promise<PageResult<Role>>;
  getById?(id: string, signal?: AbortSignal): Promise<RoleItem | Role | null>;
  create?(input: CreateRolePayload, signal?: AbortSignal): Promise<RoleItem | Role>;
  updateRole?(id: string, input: UpdateRolePayload, signal?: AbortSignal): Promise<RoleItem | Role>;
  delete?(id: string, signal?: AbortSignal): Promise<void>;
  updatePermissions(id: string, permissions: Record<string, string[]> | string[], signal?: AbortSignal): Promise<void>;
  userCounts(signal?: AbortSignal): Promise<Record<string, number>>;
}

export interface PermissionRepository {
  listGrouped(signal?: AbortSignal): Promise<PermissionModuleGroup[]>;
}

export interface AuditRepository {
  activityLogs(userId?: string | null, signal?: AbortSignal): Promise<PageResult<ActivityLog>>;
  loginHistory(
    userId?: string | null,
    signal?: AbortSignal
  ): Promise<PageResult<LoginHistoryRecord>>;
  revokeSession(id: string, signal?: AbortSignal): Promise<void>;
}
