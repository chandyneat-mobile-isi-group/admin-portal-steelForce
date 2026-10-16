import { ApiError } from '@/domain/errors/api-error';
import type {
  ActivityLog,
  AppUserWithRelations,
  Department,
  LoginHistoryRecord,
  PermissionModuleGroup,
  Role,
} from '@/domain/entities/user';
import { clone, createPersistentStore, mockDelay, mockId } from '@/services/mock';
import {
  CURRENT_USER_ID,
  seedActivityLogs,
  seedDepartments,
  seedLoginHistory,
  seedPermissionGroups,
  seedRoles,
  seedUsers,
  type UserRecord,
} from './mock-data';
import { isActiveSalesEmployee } from './sales-employees';

/**
 * The user-administration "backend" for the static prototype.
 *
 * Collections live in localStorage (see `createPersistentStore`), so an account created,
 * disabled or re-roled on one screen is the same on every other screen and survives a
 * refresh. The rules the server enforced — unique e-mail and employee code, the SAP link
 * for representatives, protected system roles, no deleting yourself — are enforced here
 * with the same error codes, so the pages' error handling is exercised too.
 */

export type { UserRecord } from './mock-data';
export { CURRENT_USER_ID } from './mock-data';

const departmentsDb = createPersistentStore<Department[]>('users.departments', seedDepartments);
const rolesDb = createPersistentStore<Role[]>('users.roles', seedRoles);
const usersDb = createPersistentStore<UserRecord[]>('users.accounts', seedUsers);
const activityDb = createPersistentStore<ActivityLog[]>('users.activity', () => seedActivityLogs(usersDb.get()));
const loginDb = createPersistentStore<LoginHistoryRecord[]>('users.logins', () => seedLoginHistory(usersDb.get()));

const REPRESENTATIVE_ROLE_ID = 'role-sales-rep';

function fail(status: number, kind: ApiError['kind'], code: string, messageKey: string, detail?: string): never {
  throw new ApiError(status, kind, messageKey, { code, details: detail ? { detail } : undefined });
}

const sameText = (a?: string | null, b?: string | null) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

function withRelations(u: UserRecord): AppUserWithRelations {
  return clone({
    ...u,
    department: departmentsDb.get().find((d) => d.id === u.department_id) ?? null,
    role: rolesDb.get().find((r) => r.id === u.role_id) ?? null,
  });
}

/** Mutations leave a trail so the activity log reflects what you just did. */
function recordActivity(action: string, targetUserId: string | null = null, status = 'success') {
  activityDb.update((logs) => [
    {
      id: mockId('log'),
      user_id: CURRENT_USER_ID,
      action,
      target_user_id: targetUserId,
      ip_address: '10.20.1.15',
      browser: 'Chrome 129',
      device: 'Laptop',
      status,
      created_at: new Date().toISOString(),
    },
    ...logs,
  ]);
}

// ---------------------------------------------------------------- lookups

/** Resolves a role from its id or its name — the pages send either. */
export function resolveRoleId(value?: string | null): string | null {
  if (!value) return null;
  const role = rolesDb.get().find((r) => r.id === value || sameText(r.name, value));
  return role?.id ?? null;
}

/**
 * Resolves a department from its id or name. Free text that matches nothing is kept as
 * typed — the detail screen shows `department_id` when there is no department record.
 */
export function resolveDepartmentId(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const dept = departmentsDb.get().find((d) => d.id === value || sameText(d.name, value));
  return dept?.id ?? value.trim();
}

/** Synchronous read for other mock services (the Sales Reps board). */
export function userRecords(): UserRecord[] {
  return clone(usersDb.get().filter((u) => !u.deleted_at));
}

export function roleRecords(): Role[] {
  return clone(rolesDb.get());
}

// ---------------------------------------------------------------- users

export async function fetchUsers(signal?: AbortSignal): Promise<AppUserWithRelations[]> {
  await mockDelay(undefined, signal);
  return usersDb
    .get()
    .filter((u) => !u.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(withRelations);
}

export async function fetchUserById(id: string, signal?: AbortSignal): Promise<AppUserWithRelations | null> {
  await mockDelay(undefined, signal);
  const found = usersDb.get().find((u) => u.id === id && !u.deleted_at);
  return found ? withRelations(found) : null;
}

function assertUnique(candidate: Partial<UserRecord>, exceptId?: string) {
  const others = usersDb.get().filter((u) => !u.deleted_at && u.id !== exceptId);
  if (candidate.email && others.some((u) => sameText(u.email, candidate.email))) {
    fail(409, 'conflict', 'User.EmailAlreadyExists', 'api.error.user.emailAlreadyExists');
  }
  const code = candidate.employee_id?.trim();
  if (code && others.some((u) => sameText(u.employee_id, code))) {
    fail(409, 'conflict', 'User.EmployeeCodeAlreadyExists', 'api.error.user.employeeCodeAlreadyExists');
  }
}

/** A representative must be linked to a current SAP sales employee (enforced on create). */
function assertRepresentativeLink(roleId: string | null | undefined, code: string | null | undefined) {
  if (roleId !== REPRESENTATIVE_ROLE_ID) return;
  if (!code?.trim()) fail(422, 'validation', 'User.SalesEmployeeCodeRequired', 'api.error.validation');
  if (!isActiveSalesEmployee(code)) fail(422, 'validation', 'User.SalesEmployeeCodeUnknown', 'api.error.validation');
}

export async function createUser(input: Partial<UserRecord>, signal?: AbortSignal): Promise<AppUserWithRelations> {
  await mockDelay(undefined, signal);
  if (!input.full_name?.trim()) fail(422, 'validation', 'General.Validation', 'api.error.validation');
  assertUnique(input);
  assertRepresentativeLink(input.role_id, input.employee_id);

  const timestamp = new Date().toISOString();
  const username = input.username || (input.email ? input.email.split('@')[0] : input.full_name!.toLowerCase().replace(/\s+/g, '.'));
  const created: UserRecord = {
    id: mockId('user'),
    full_name: input.full_name!.trim(),
    employee_id: input.employee_id?.trim() || null,
    username,
    email: input.email ?? null,
    phone: input.phone ?? null,
    gender: input.gender ?? null,
    birthday: input.birthday ?? null,
    address: input.address ?? null,
    department_id: input.department_id ?? null,
    position: input.position ?? null,
    role_id: input.role_id ?? null,
    manager_name: input.manager_name ?? null,
    join_date: input.join_date ?? timestamp.slice(0, 10),
    employment_status: input.employment_status ?? 'Active',
    account_status: input.account_status ?? 'active',
    avatar_url: input.avatar_url ?? null,
    temp_password: input.temp_password ?? null,
    force_password_reset: input.force_password_reset ?? true,
    failed_login_attempts: 0,
    last_login: null,
    last_password_change: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    territory_code: input.territory_code ?? null,
    depot_code: input.depot_code ?? null,
    preferred_language: input.preferred_language ?? 'km-KH',
    time_zone_id: input.time_zone_id ?? 'Asia/Phnom_Penh',
  };

  usersDb.update((users) => [created, ...users]);
  recordActivity('User Created', created.id);
  return withRelations(created);
}

function requireUser(id: string): UserRecord {
  const found = usersDb.get().find((u) => u.id === id && !u.deleted_at);
  if (!found) fail(404, 'not_found', 'User.NotFound', 'api.error.user.notFound');
  return found;
}

/** Applies `patch`, skipping `undefined` fields, and returns the updated account. */
export async function updateUser(
  id: string,
  patch: Partial<UserRecord>,
  signal?: AbortSignal,
  action: string | null = 'User Updated'
): Promise<AppUserWithRelations> {
  await mockDelay(undefined, signal);
  const current = requireUser(id);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<UserRecord>;
  assertUnique(defined, id);
  if (defined.role_id && defined.role_id !== current.role_id) action = 'Role Changed';

  const next: UserRecord = { ...current, ...defined, updated_at: new Date().toISOString() };
  usersDb.update((users) => users.map((u) => (u.id === id ? next : u)));
  if (action) recordActivity(action, id);
  return withRelations(next);
}

export async function setUserStatus(id: string, accountStatus: string, signal?: AbortSignal): Promise<void> {
  if (id === CURRENT_USER_ID && accountStatus !== 'active') {
    await mockDelay(undefined, signal);
    fail(409, 'conflict', 'User.CannotDeactivateSelf', 'api.error.user.cannotDeactivateSelf');
  }
  const enabling = accountStatus === 'active';
  await updateUser(
    id,
    {
      account_status: accountStatus,
      employment_status: enabling ? 'Active' : undefined,
      failed_login_attempts: enabling ? 0 : undefined,
    },
    signal,
    enabling ? 'User Enabled' : 'User Disabled'
  );
  // A disabled account loses its open sessions, as the server would.
  if (!enabling) closeOpenSessions(id);
}

export async function unlockUser(id: string, signal?: AbortSignal): Promise<void> {
  await updateUser(id, { account_status: 'active', failed_login_attempts: 0 }, signal, 'User Unlocked');
}

export async function resetUserPassword(id: string, tempPassword: string, signal?: AbortSignal): Promise<void> {
  if (tempPassword.trim().length < 6) {
    await mockDelay(undefined, signal);
    fail(422, 'validation', 'General.Validation', 'api.error.validation');
  }
  await updateUser(
    id,
    {
      temp_password: tempPassword,
      force_password_reset: id !== CURRENT_USER_ID,
      last_password_change: new Date().toISOString(),
      failed_login_attempts: 0,
    },
    signal,
    id === CURRENT_USER_ID ? 'Password Changed' : 'Password Reset'
  );
}

export async function deleteUsers(ids: string[], signal?: AbortSignal): Promise<void> {
  await mockDelay(undefined, signal);
  if (ids.length === 1 && ids[0] === CURRENT_USER_ID) {
    fail(409, 'conflict', 'User.CannotDeleteSelf', 'api.error.user.cannotDeleteSelf');
  }
  // A bulk delete quietly leaves your own account alone.
  const targets = ids.filter((id) => id !== CURRENT_USER_ID);
  const timestamp = new Date().toISOString();
  usersDb.update((users) => users.map((u) => (targets.includes(u.id) ? { ...u, deleted_at: timestamp } : u)));
  targets.forEach((id) => {
    closeOpenSessions(id);
    recordActivity('User Deleted', id);
  });
}

// ---------------------------------------------------------- departments

export async function fetchDepartments(signal?: AbortSignal): Promise<Department[]> {
  await mockDelay(undefined, signal);
  return clone([...departmentsDb.get()].sort((a, b) => a.name.localeCompare(b.name)));
}

export async function createDepartment(
  input: Pick<Department, 'name' | 'description' | 'manager_name'>,
  signal?: AbortSignal
): Promise<Department> {
  await mockDelay(undefined, signal);
  const created: Department = {
    id: mockId('dept'),
    name: input.name.trim(),
    description: input.description,
    manager_name: input.manager_name,
    created_at: new Date().toISOString(),
  };
  departmentsDb.update((departments) => [...departments, created]);
  recordActivity('Department Created');
  return clone(created);
}

export async function updateDepartment(
  id: string,
  patch: Pick<Department, 'name' | 'description' | 'manager_name'>,
  signal?: AbortSignal
): Promise<void> {
  await mockDelay(undefined, signal);
  departmentsDb.update((departments) => departments.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  recordActivity('Department Updated');
}

export async function deleteDepartment(id: string, signal?: AbortSignal): Promise<void> {
  await mockDelay(undefined, signal);
  departmentsDb.update((departments) => departments.filter((d) => d.id !== id));
  // Mirrors the old ON DELETE SET NULL behaviour.
  usersDb.update((users) => users.map((u) => (u.department_id === id ? { ...u, department_id: null } : u)));
  recordActivity('Department Deleted');
}

/** department_id -> number of non-deleted users. */
export async function fetchUserCountsByDepartment(signal?: AbortSignal): Promise<Record<string, number>> {
  await mockDelay(undefined, signal);
  return countBy('department_id');
}

// ---------------------------------------------------------------- roles

function countBy(key: 'role_id' | 'department_id'): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of usersDb.get()) {
    const value = u[key];
    if (u.deleted_at || !value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

export async function fetchRoles(signal?: AbortSignal): Promise<Role[]> {
  await mockDelay(undefined, signal);
  const counts = countBy('role_id');
  return clone(
    [...rolesDb.get()]
      .sort((a, b) => (a.is_system !== b.is_system ? (a.is_system ? -1 : 1) : a.name.localeCompare(b.name)))
      .map((r) => ({ ...r, user_count: counts[r.id] ?? 0 }))
  );
}

export async function fetchRoleById(id: string, signal?: AbortSignal): Promise<Role | null> {
  await mockDelay(undefined, signal);
  const found = rolesDb.get().find((r) => r.id === id || sameText(r.name, id));
  return found ? clone({ ...found, user_count: countBy('role_id')[found.id] ?? 0 }) : null;
}

function assertRoleNameFree(name: string, exceptId?: string) {
  if (rolesDb.get().some((r) => r.id !== exceptId && sameText(r.name, name))) {
    fail(409, 'conflict', 'Role.DuplicateName', 'api.error.role.duplicateName');
  }
}

export async function createRole(
  input: { name: string; description?: string; permissions?: Record<string, string[]> },
  signal?: AbortSignal
): Promise<Role> {
  await mockDelay(undefined, signal);
  assertRoleNameFree(input.name);
  const created: Role = {
    id: mockId('role'),
    name: input.name.trim(),
    description: input.description || '',
    is_system: false,
    permissions: input.permissions ?? {},
    created_at: new Date().toISOString(),
  };
  rolesDb.update((roles) => [...roles, created]);
  recordActivity('Role Created');
  return clone({ ...created, user_count: 0 });
}

export async function updateRole(
  id: string,
  input: { name: string; description?: string },
  signal?: AbortSignal
): Promise<Role> {
  await mockDelay(undefined, signal);
  const current = rolesDb.get().find((r) => r.id === id);
  if (!current) fail(404, 'not_found', 'Role.NotFound', 'api.error.role.notFound');
  // System roles keep their names: other modules (the Sales Reps board) match on them.
  if (current.is_system && !sameText(current.name, input.name)) {
    fail(409, 'conflict', 'Role.SystemImmutable', 'api.error.role.systemImmutable');
  }
  assertRoleNameFree(input.name, id);
  const next: Role = { ...current, name: input.name.trim(), description: input.description ?? current.description };
  rolesDb.update((roles) => roles.map((r) => (r.id === id ? next : r)));
  recordActivity('Role Updated');
  return clone(next);
}

export async function deleteRole(id: string, signal?: AbortSignal): Promise<void> {
  await mockDelay(undefined, signal);
  const current = rolesDb.get().find((r) => r.id === id);
  if (!current) fail(404, 'not_found', 'Role.NotFound', 'api.error.role.notFound');
  if (current.is_system) fail(409, 'conflict', 'Role.SystemImmutable', 'api.error.role.systemImmutable');
  if ((countBy('role_id')[id] ?? 0) > 0) fail(409, 'conflict', 'Role.HasAssignedUsers', 'api.error.role.hasAssignedUsers');
  rolesDb.update((roles) => roles.filter((r) => r.id !== id));
  recordActivity('Role Deleted');
}

export async function updateRolePermissions(
  id: string,
  permissions: Record<string, string[]>,
  signal?: AbortSignal
): Promise<void> {
  await mockDelay(undefined, signal);
  if (!rolesDb.get().some((r) => r.id === id)) fail(404, 'not_found', 'Role.NotFound', 'api.error.role.notFound');
  const known = new Set(seedPermissionGroups().flatMap((g) => g.permissions.map((p) => p.name)));
  const cleaned: Record<string, string[]> = {};
  for (const [module, actions] of Object.entries(permissions)) {
    const key = module.toLowerCase();
    const valid = Array.from(new Set(actions)).filter((a) => known.has(`${key}.${a}`));
    if (valid.length) cleaned[key] = valid;
  }
  rolesDb.update((roles) => roles.map((r) => (r.id === id ? { ...r, permissions: cleaned } : r)));
  recordActivity('Permissions Updated');
}

/** role_id -> number of non-deleted users. */
export async function fetchUserCountsByRole(signal?: AbortSignal): Promise<Record<string, number>> {
  await mockDelay(undefined, signal);
  return countBy('role_id');
}

export async function fetchPermissionGroups(signal?: AbortSignal): Promise<PermissionModuleGroup[]> {
  await mockDelay(undefined, signal);
  return seedPermissionGroups();
}

// ------------------------------------------------------ logs & sessions

export async function fetchActivityLogs(userId?: string | null, signal?: AbortSignal): Promise<ActivityLog[]> {
  await mockDelay(undefined, signal);
  return clone(
    activityDb
      .get()
      .filter((l) => !userId || l.user_id === userId || l.target_user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  );
}

export async function fetchLoginHistory(userId?: string | null, signal?: AbortSignal): Promise<LoginHistoryRecord[]> {
  await mockDelay(undefined, signal);
  return clone(
    loginDb
      .get()
      .filter((s) => !userId || s.user_id === userId)
      .sort((a, b) => b.login_time.localeCompare(a.login_time))
  );
}

function closeOpenSessions(userId: string): number {
  const now = new Date().toISOString();
  let closed = 0;
  loginDb.update((rows) =>
    rows.map((s) => {
      if (s.user_id !== userId || s.logout_time || s.status !== 'success') return s;
      closed += 1;
      return { ...s, logout_time: now };
    })
  );
  return closed;
}

/** Ends one login session (Login History → Revoke). */
export async function revokeSession(id: string, signal?: AbortSignal): Promise<void> {
  await mockDelay(undefined, signal);
  const session = loginDb.get().find((s) => s.id === id);
  loginDb.update((rows) => rows.map((s) => (s.id === id ? { ...s, logout_time: new Date().toISOString() } : s)));
  recordActivity('Session Revoked', session?.user_id ?? null);
}

/** Signs a user out everywhere: every open session is closed. */
export async function revokeUserSessions(userId: string, signal?: AbortSignal): Promise<void> {
  await mockDelay(undefined, signal);
  requireUser(userId);
  closeOpenSessions(userId);
  recordActivity('Sessions Revoked', userId);
}

/** Lookup map used by the log tables to show who did what (deleted accounts included). */
export async function fetchUserDirectory(signal?: AbortSignal): Promise<Record<string, UserRecord>> {
  await mockDelay(undefined, signal);
  return clone(Object.fromEntries(usersDb.get().map((u) => [u.id, u])));
}
