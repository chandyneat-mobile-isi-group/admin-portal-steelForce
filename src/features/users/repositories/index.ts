import {
  MockAuditRepository,
  MockDepartmentRepository,
  MockPermissionRepository,
  MockRoleRepository,
  MockUserRepository,
} from './mock-user-management-repository';
import type {
  AuditRepository,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  UserRepository,
} from './types';

export type {
  AuditRepository,
  CreateRolePayload,
  CreateUserInput,
  CreateUserPayload,
  DepartmentInput,
  DepartmentRepository,
  PermissionRepository,
  RoleRepository,
  SalesEmployeeOption,
  UpdateProfilePayload,
  UpdateRolePayload,
  UpdateUserInput,
  UpdateUserPayload,
  UserListQuery,
  UserListQueryParams,
  UserRepository,
} from './types';

export {
  MockAuditRepository,
  MockDepartmentRepository,
  MockPermissionRepository,
  MockRoleRepository,
  MockUserRepository,
} from './mock-user-management-repository';

// The static prototype has no backend: every repository is the local mock.
export const usersRepository: UserRepository = new MockUserRepository();
export const rolesRepository: RoleRepository = new MockRoleRepository();
export const permissionsRepository: PermissionRepository = new MockPermissionRepository();
export const departmentsRepository: DepartmentRepository = new MockDepartmentRepository();
export const auditRepository: AuditRepository = new MockAuditRepository();
