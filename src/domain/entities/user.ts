/** User-administration entities. Framework-free: no React, Next, or transport imports. */

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_name: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count?: number;
  permissions: Record<string, string[]>;
  created_at: string;
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

export interface AppUser {
  id: string;
  full_name: string;
  employee_id: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  address: string | null;
  department_id: string | null;
  position: string | null;
  role_id: string | null;
  manager_name: string | null;
  join_date: string | null;
  employment_status: string;
  account_status: string;
  avatar_url: string | null;
  temp_password: string | null;
  force_password_reset: boolean;
  failed_login_attempts: number;
  last_login: string | null;
  last_password_change: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AppUserWithRelations extends AppUser {
  department?: Department | null;
  role?: Role | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  target_user_id: string | null;
  ip_address: string | null;
  browser: string | null;
  device: string | null;
  status: string;
  created_at: string;
  user?: AppUser | null;
  target_user?: AppUser | null;
}

export interface LoginHistoryRecord {
  id: string;
  user_id: string | null;
  login_time: string;
  logout_time: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location: string | null;
  status: string;
  created_at: string;
  user?: AppUser | null;
}
