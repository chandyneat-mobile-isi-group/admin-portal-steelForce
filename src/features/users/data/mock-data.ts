import type {
  ActivityLog,
  AppUser,
  Department,
  LoginHistoryRecord,
  PermissionModuleGroup,
  Role,
} from '@/domain/entities/user';
import { depots, salesReps } from '@/features/planning/data/demo-data';

/**
 * Seed data for user administration.
 *
 * Every export is a factory: timestamps are relative to the moment the store is first
 * read, so the demo always looks current, and a "reset demo data" starts from the same
 * shape. The field team is the planning module's twenty reps (same ids, names and
 * phones), so a rep opened from Users, Sales Reps or the planning board is one person.
 */

/** The prototype's signed-in account — matches `infrastructure/auth/repository.ts`. */
export const CURRENT_USER_ID = 'USR-001';

/** Extra account fields the portal edits but the shared `AppUser` entity does not carry. */
export interface UserRecord extends AppUser {
  territory_code?: string | null;
  depot_code?: string | null;
  preferred_language?: string | null;
  time_zone_id?: string | null;
}

const HOUR = 3_600_000;
const DAY = 86_400_000;

function clock() {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    now,
    iso,
    hoursAgo: (n: number) => iso(now - n * HOUR),
    daysAgo: (n: number) => iso(now - n * DAY),
  };
}

// ---------------------------------------------------------------- departments

export function seedDepartments(): Department[] {
  const { daysAgo } = clock();
  return [
    { id: 'dept-sales', name: 'Sales', description: 'Field sales, dealer and depot accounts across all provinces', manager_name: 'Chan Sopheak', created_at: daysAgo(900) },
    { id: 'dept-finance', name: 'Finance', description: 'Accounts receivable, credit control and invoicing', manager_name: 'Heng Kanha', created_at: daysAgo(900) },
    { id: 'dept-hr', name: 'Human Resources', description: 'Recruitment, payroll and staff records', manager_name: 'Lim Vuthy', created_at: daysAgo(900) },
    { id: 'dept-warehouse', name: 'Warehouse & Logistics', description: 'Depot stock, dispatch and delivery fleet', manager_name: 'Keo Ratanak', created_at: daysAgo(900) },
    { id: 'dept-it', name: 'Information Technology', description: 'Portal, mobile app and SAP integration support', manager_name: 'System Administrator', created_at: daysAgo(900) },
    { id: 'dept-cs', name: 'Customer Service', description: 'Dealer hotline, complaints and order follow-up', manager_name: 'Nhem Bopha', created_at: daysAgo(640) },
    { id: 'dept-admin', name: 'Administration', description: 'General management and office administration', manager_name: 'Prak Vicheka', created_at: daysAgo(900) },
  ];
}

// ---------------------------------------------------------------- permissions

/**
 * The permission catalogue, keyed `<module>.<action>`. Actions use the shared
 * `PERMISSION_ACTIONS` vocabulary so every grant has a column on the matrix screen.
 */
const CATALOGUE: { module: string; label: string; actions: Record<string, string> }[] = [
  { module: 'dashboard', label: 'Dashboard', actions: { view: 'View the sales dashboard and KPIs' } },
  {
    module: 'orders',
    label: 'Orders',
    actions: {
      view: 'View orders and order history',
      create: 'Book new customer orders',
      update: 'Edit and approve open orders',
      delete: 'Cancel draft orders',
      export: 'Export order lists',
    },
  },
  {
    module: 'customers',
    label: 'Customers',
    actions: {
      view: 'View the customer directory',
      create: 'Register new customers',
      update: 'Edit customer details and credit terms',
      delete: 'Archive customers',
      export: 'Export customer lists',
    },
  },
  {
    module: 'visits',
    label: 'Visits',
    actions: {
      view: 'View visit plans and check-ins',
      create: 'Plan visits and call plans',
      update: 'Reassign and reschedule visits',
      manage: 'Review flagged visits and route compliance',
    },
  },
  { module: 'depots', label: 'Depots', actions: { view: 'View depots', create: 'Register depots', update: 'Edit depot details' } },
  { module: 'products', label: 'Products', actions: { view: 'View the product catalogue', manage: 'Maintain prices and promotions' } },
  { module: 'reports', label: 'Reports', actions: { view: 'Open reports', export: 'Download report files' } },
  {
    module: 'users',
    label: 'Users',
    actions: {
      view: 'View user accounts',
      create: 'Create user accounts',
      update: 'Edit accounts, enable or disable them',
      delete: 'Delete user accounts',
      reset_password: 'Reset passwords and unlock accounts',
    },
  },
  { module: 'roles', label: 'Roles', actions: { view: 'View roles and grants', manage: 'Create roles and change permissions' } },
  { module: 'settings', label: 'Settings', actions: { view: 'View system settings', manage: 'Change system settings' } },
];

const SYSTEM_MODULES = new Set(['users', 'roles', 'settings']);

export function seedPermissionGroups(): PermissionModuleGroup[] {
  let seq = 0;
  return CATALOGUE.map((group) => ({
    module: group.module,
    permissions: Object.entries(group.actions).map(([action, description]) => {
      seq += 1;
      return {
        id: `perm-${String(seq).padStart(3, '0')}`,
        name: `${group.module}.${action}`,
        module: group.module,
        displayName: `${action === 'reset_password' ? 'Reset passwords' : action[0].toUpperCase() + action.slice(1)} · ${group.label}`,
        description,
        isSystem: SYSTEM_MODULES.has(group.module),
      };
    }),
  }));
}

/** Every grant in the catalogue, as a role matrix. */
function fullMatrix(): Record<string, string[]> {
  return Object.fromEntries(CATALOGUE.map((g) => [g.module, Object.keys(g.actions)]));
}

// ---------------------------------------------------------------- roles

export function seedRoles(): Role[] {
  const { daysAgo } = clock();
  const system = (id: string, name: string, description: string, permissions: Record<string, string[]>): Role => ({
    id,
    name,
    description,
    is_system: true,
    permissions,
    created_at: daysAgo(900),
  });

  return [
    system('role-super-admin', 'Super Admin', 'Unrestricted access, including system settings', fullMatrix()),
    system('role-admin', 'Admin', 'Portal administration: users, roles and every module', fullMatrix()),
    system('role-manager', 'Manager', 'Department head with oversight of orders, customers and reports', {
      dashboard: ['view'],
      orders: ['view', 'create', 'update', 'export'],
      customers: ['view', 'create', 'update', 'export'],
      visits: ['view', 'manage'],
      depots: ['view'],
      products: ['view'],
      reports: ['view', 'export'],
      users: ['view'],
    }),
    system('role-sales-supervisor', 'Sales Supervisor', 'Leads a team of field representatives and their routes', {
      dashboard: ['view'],
      orders: ['view', 'create', 'update', 'export'],
      customers: ['view', 'create', 'update'],
      visits: ['view', 'create', 'update', 'manage'],
      depots: ['view', 'create', 'update'],
      products: ['view'],
      reports: ['view'],
      users: ['view'],
    }),
    system('role-sales-rep', 'Sales Representative', 'Field sales on the mobile app: visits, orders and new customers', {
      dashboard: ['view'],
      orders: ['view', 'create'],
      customers: ['view', 'create'],
      visits: ['view', 'update'],
      depots: ['view', 'create'],
      products: ['view'],
    }),
    system('role-finance', 'Finance', 'Invoicing, credit control and payment follow-up', {
      dashboard: ['view'],
      orders: ['view', 'export'],
      customers: ['view', 'update'],
      reports: ['view', 'export'],
    }),
    system('role-warehouse', 'Warehouse', 'Depot stock and dispatch', {
      dashboard: ['view'],
      orders: ['view', 'update'],
      depots: ['view', 'update'],
      products: ['view'],
      reports: ['view'],
    }),
    system('role-customer-service', 'Customer Service', 'Dealer hotline and order follow-up', {
      dashboard: ['view'],
      orders: ['view', 'update'],
      customers: ['view', 'update'],
      visits: ['view'],
    }),
    system('role-viewer', 'Viewer', 'Read-only access to operational screens', {
      dashboard: ['view'],
      orders: ['view'],
      customers: ['view'],
      visits: ['view'],
      reports: ['view'],
    }),
    {
      id: 'role-regional-lead',
      name: 'Regional Lead',
      description: 'Provincial sales oversight for Battambang and Siem Reap',
      is_system: false,
      permissions: {
        dashboard: ['view'],
        orders: ['view', 'update', 'export'],
        customers: ['view', 'update'],
        visits: ['view', 'manage'],
        reports: ['view', 'export'],
      },
      created_at: daysAgo(120),
    },
  ];
}

// ---------------------------------------------------------------- users

/** SAP personnel numbers for the field team; reps 19 and 20 still carry a placeholder. */
export function repPersonnelNumber(index: number): string | null {
  return index < 18 ? String(103100 + index * 37) : null;
}

const DEPOT_BY_PROVINCE: Record<string, string> = Object.fromEntries(
  depots.map((d) => [d.province, d.code])
);

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
}

export function seedUsers(): UserRecord[] {
  const { hoursAgo, daysAgo } = clock();

  const base = (input: Partial<UserRecord> & Pick<UserRecord, 'id' | 'full_name'>): UserRecord => {
    const username = input.username ?? slug(input.full_name);
    return {
      employee_id: null,
      username,
      email: `${username}@steelforce.com.kh`,
      phone: null,
      gender: null,
      birthday: null,
      address: null,
      department_id: null,
      position: null,
      role_id: null,
      manager_name: null,
      join_date: null,
      employment_status: 'Active',
      account_status: 'active',
      avatar_url: null,
      temp_password: null,
      force_password_reset: false,
      failed_login_attempts: 0,
      last_login: null,
      last_password_change: daysAgo(30),
      created_at: daysAgo(400),
      updated_at: daysAgo(12),
      deleted_at: null,
      territory_code: null,
      depot_code: null,
      preferred_language: 'km-KH',
      time_zone_id: 'Asia/Phnom_Penh',
      ...input,
    };
  };

  const staff: UserRecord[] = [
    base({
      id: CURRENT_USER_ID, full_name: 'System Administrator', username: 'admin', email: 'admin@gmail.com',
      employee_id: 'ISI-0001', phone: '+855 12 345 678', gender: 'Male', address: 'Toul Kork, Phnom Penh',
      department_id: 'dept-it', position: 'System Administrator', role_id: 'role-admin', manager_name: 'Prak Vicheka',
      join_date: '2019-02-01', preferred_language: 'en-US', last_login: hoursAgo(0.2), last_password_change: daysAgo(21),
      created_at: daysAgo(1200),
    }),
    base({
      id: 'user-01', full_name: 'Prak Vicheka', employee_id: 'ISI-0002', phone: '+855 12 880 101', gender: 'Female',
      birthday: '1978-04-12', address: 'Chamkar Mon, Phnom Penh', department_id: 'dept-admin', position: 'General Manager',
      role_id: 'role-super-admin', join_date: '2016-01-04', last_login: hoursAgo(3), created_at: daysAgo(1180),
    }),
    base({
      id: 'user-02', full_name: 'Chan Sopheak', employee_id: 'ISI-0014', phone: '+855 12 774 220', gender: 'Male',
      birthday: '1982-09-23', address: 'Sen Sok, Phnom Penh', department_id: 'dept-sales', position: 'Head of Sales',
      role_id: 'role-manager', manager_name: 'Prak Vicheka', join_date: '2017-06-15', last_login: hoursAgo(1.5),
      created_at: daysAgo(1100),
    }),
    base({
      id: 'user-03', full_name: 'Sok Dara', employee_id: 'ISI-0031', phone: '+855 17 552 318', gender: 'Male',
      birthday: '1987-02-08', address: 'Mean Chey, Phnom Penh', department_id: 'dept-sales',
      position: 'Sales Supervisor — Phnom Penh', role_id: 'role-sales-supervisor', manager_name: 'Chan Sopheak',
      join_date: '2018-03-01', territory_code: 'Team Alpha', depot_code: 'PP-MAIN', last_login: hoursAgo(2),
      created_at: daysAgo(980),
    }),
    base({
      id: 'user-04', full_name: 'Meas Sreymom', employee_id: 'ISI-0038', phone: '+855 16 420 917', gender: 'Female',
      birthday: '1989-11-30', address: 'Battambang City, Battambang', department_id: 'dept-sales',
      position: 'Sales Supervisor — Provinces', role_id: 'role-sales-supervisor', manager_name: 'Chan Sopheak',
      join_date: '2019-01-14', territory_code: 'Team Delta', depot_code: 'BB-CITY', last_login: hoursAgo(5),
      created_at: daysAgo(900),
    }),
    base({
      id: 'user-05', full_name: 'Tep Malis', employee_id: 'ISI-0052', phone: '+855 92 615 403', gender: 'Female',
      birthday: '1991-07-19', address: 'Siem Reap City, Siem Reap', department_id: 'dept-sales',
      position: 'Regional Sales Lead', role_id: 'role-regional-lead', manager_name: 'Chan Sopheak',
      join_date: '2021-08-02', last_login: hoursAgo(20), created_at: daysAgo(520),
    }),
    base({
      id: 'user-06', full_name: 'Heng Kanha', employee_id: 'ISI-0020', phone: '+855 12 903 664', gender: 'Female',
      birthday: '1984-05-02', address: 'Daun Penh, Phnom Penh', department_id: 'dept-finance', position: 'Finance Manager',
      role_id: 'role-finance', manager_name: 'Prak Vicheka', join_date: '2017-10-09', last_login: daysAgo(1),
      created_at: daysAgo(1050),
    }),
    base({
      id: 'user-07', full_name: 'Ouk Sreyneang', employee_id: 'ISI-0063', phone: '+855 98 330 271', gender: 'Female',
      birthday: '1994-12-11', address: 'Russey Keo, Phnom Penh', department_id: 'dept-finance', position: 'Accountant',
      role_id: 'role-finance', manager_name: 'Heng Kanha', join_date: '2022-02-21', last_login: daysAgo(2),
      created_at: daysAgo(420),
    }),
    base({
      id: 'user-08', full_name: 'Ros Pisey', employee_id: 'ISI-0071', phone: '+855 89 712 045', gender: 'Female',
      birthday: '1996-03-27', address: 'Ta Khmau, Kandal', department_id: 'dept-finance', position: 'Credit Controller',
      role_id: 'role-finance', manager_name: 'Heng Kanha', join_date: '2024-05-06', force_password_reset: true,
      last_login: null, last_password_change: daysAgo(3), created_at: daysAgo(3),
    }),
    base({
      id: 'user-09', full_name: 'Lim Vuthy', employee_id: 'ISI-0025', phone: '+855 11 284 590', gender: 'Male',
      birthday: '1983-08-14', address: 'Prampi Makara, Phnom Penh', department_id: 'dept-hr', position: 'HR Manager',
      role_id: 'role-manager', manager_name: 'Prak Vicheka', join_date: '2018-01-08', last_login: hoursAgo(26),
      created_at: daysAgo(990),
    }),
    base({
      id: 'user-10', full_name: 'Yim Sovann', employee_id: 'ISI-0058', phone: '+855 70 461 832', gender: 'Male',
      birthday: '1993-06-05', address: 'Pou Senchey, Phnom Penh', department_id: 'dept-hr', position: 'HR Officer',
      role_id: 'role-viewer', manager_name: 'Lim Vuthy', join_date: '2021-04-12', account_status: 'disabled',
      employment_status: 'Resigned', last_login: daysAgo(46), created_at: daysAgo(560),
    }),
    base({
      id: 'user-11', full_name: 'Keo Ratanak', employee_id: 'ISI-0029', phone: '+855 12 667 015', gender: 'Male',
      birthday: '1985-10-21', address: 'Chroy Changvar, Phnom Penh', department_id: 'dept-warehouse',
      position: 'Warehouse Supervisor', role_id: 'role-warehouse', manager_name: 'Prak Vicheka', join_date: '2018-02-19',
      depot_code: 'PP-NORTH', last_login: hoursAgo(9), created_at: daysAgo(960),
    }),
    base({
      id: 'user-12', full_name: 'Pen Rithy', employee_id: 'ISI-0066', phone: '+855 15 239 774', gender: 'Male',
      birthday: '1995-01-17', address: 'Dangkao, Phnom Penh', department_id: 'dept-warehouse', position: 'Inventory Clerk',
      role_id: 'role-warehouse', manager_name: 'Keo Ratanak', join_date: '2022-07-25', depot_code: 'PP-MAIN',
      account_status: 'locked', failed_login_attempts: 5, last_login: daysAgo(6), created_at: daysAgo(380),
    }),
    base({
      id: 'user-13', full_name: 'Nhem Bopha', employee_id: 'ISI-0044', phone: '+855 10 548 336', gender: 'Female',
      birthday: '1990-09-09', address: 'Tuol Kork, Phnom Penh', department_id: 'dept-cs', position: 'Customer Service Lead',
      role_id: 'role-customer-service', manager_name: 'Prak Vicheka', join_date: '2019-11-04', last_login: hoursAgo(4),
      created_at: daysAgo(700),
    }),
    base({
      id: 'user-14', full_name: 'Seng Chenda', employee_id: 'ISI-0075', phone: '+855 93 802 117', gender: 'Female',
      birthday: '1998-02-25', address: 'Sen Sok, Phnom Penh', department_id: 'dept-cs', position: 'Customer Service Officer',
      role_id: 'role-customer-service', manager_name: 'Nhem Bopha', join_date: '2024-09-16', last_login: hoursAgo(7),
      created_at: daysAgo(200),
    }),
    base({
      id: 'user-15', full_name: 'Chhim Sokha', employee_id: 'ISI-0049', phone: '+855 81 330 562', gender: 'Male',
      birthday: '1992-05-30', address: 'Chamkar Mon, Phnom Penh', department_id: 'dept-it', position: 'IT Support Engineer',
      role_id: 'role-viewer', manager_name: 'System Administrator', join_date: '2020-10-05', force_password_reset: true,
      failed_login_attempts: 2, last_login: daysAgo(3), last_password_change: daysAgo(95), created_at: daysAgo(610),
    }),
  ];

  // The planning module's field team, one account each.
  const reps: UserRecord[] = salesReps.map((rep, i) => {
    const phnomPenh = rep.province === 'Phnom Penh';
    return base({
      id: rep.id,
      full_name: rep.name,
      employee_id: repPersonnelNumber(i) ?? `EMP-${String(119 + i - 18).padStart(4, '0')}`,
      phone: rep.phone,
      gender: i % 3 === 1 ? 'Female' : 'Male',
      address: rep.currentLocation.includes(rep.province) ? rep.currentLocation : `${rep.province}, Cambodia`,
      department_id: 'dept-sales',
      position: 'Sales Representative',
      role_id: 'role-sales-rep',
      manager_name: phnomPenh ? 'Sok Dara' : 'Meas Sreymom',
      join_date: new Date(Date.now() - (720 - i * 31) * DAY).toISOString().slice(0, 10),
      territory_code: rep.team,
      depot_code: DEPOT_BY_PROVINCE[rep.province] ?? 'PP-MAIN',
      // REP-18 left the field team last month; the account is kept, but suspended.
      account_status: i === 17 ? 'disabled' : 'active',
      employment_status: i === 17 ? 'Suspended' : 'Active',
      last_login: i === 17 ? daysAgo(34) : hoursAgo(1 + ((i * 5) % 30)),
      created_at: daysAgo(720 - i * 31),
    });
  });

  return [...staff, ...reps];
}

// ---------------------------------------------------------------- audit trail

const BROWSERS = ['Chrome 129', 'Edge 129', 'Safari 18', 'Firefox 131'];
const DEVICES = ['Desktop', 'Laptop', 'Desktop', 'Tablet'];

export function seedActivityLogs(users: readonly UserRecord[]): ActivityLog[] {
  const { hoursAgo } = clock();
  const reps = users.filter((u) => u.role_id === 'role-sales-rep');
  const staff = users.filter((u) => u.role_id !== 'role-sales-rep');

  const entries: [actor: string, action: string, target: string | null, status: string][] = [
    [CURRENT_USER_ID, 'Login', null, 'success'],
    [CURRENT_USER_ID, 'User Created', 'user-08', 'success'],
    ['user-12', 'Login Failed', null, 'failed'],
    [CURRENT_USER_ID, 'Password Reset', 'user-15', 'success'],
    ['user-02', 'Export Generated', null, 'success'],
    [CURRENT_USER_ID, 'Permissions Updated', null, 'success'],
    ['user-03', 'Role Changed', reps[4]?.id ?? null, 'success'],
    [CURRENT_USER_ID, 'User Disabled', reps[17]?.id ?? null, 'success'],
    ['user-12', 'Login Failed', null, 'failed'],
    ['user-06', 'Export Generated', null, 'success'],
    [CURRENT_USER_ID, 'Department Created', null, 'success'],
    ['user-01', 'Login', null, 'success'],
    [CURRENT_USER_ID, 'Session Revoked', reps[2]?.id ?? null, 'success'],
    ['user-15', 'Login Failed', null, 'failed'],
    ['user-09', 'User Disabled', 'user-10', 'success'],
    [CURRENT_USER_ID, 'Role Created', null, 'success'],
  ];

  const logs: ActivityLog[] = entries.map(([actor, action, target, status], i) => ({
    id: `log-${String(i + 1).padStart(3, '0')}`,
    user_id: actor,
    action,
    target_user_id: target,
    ip_address: `10.20.1.${15 + (i % 30)}`,
    browser: BROWSERS[i % BROWSERS.length],
    device: DEVICES[i % DEVICES.length],
    status,
    created_at: hoursAgo(i * 4 + 1),
  }));

  // Day-to-day sign-ins from staff and the field team fill out the trail.
  for (let i = 0; i < 30; i += 1) {
    const field = i % 3 !== 0;
    const actor = field ? reps[i % reps.length] : staff[i % staff.length];
    if (!actor) continue;
    logs.push({
      id: `log-${String(entries.length + i + 1).padStart(3, '0')}`,
      user_id: actor.id,
      action: i % 11 === 7 ? 'Login Failed' : 'Login',
      target_user_id: null,
      ip_address: field ? `117.20.115.${40 + i}` : `10.20.1.${60 + i}`,
      browser: field ? 'SteelForce Mobile 3.4' : BROWSERS[i % BROWSERS.length],
      device: field ? 'Mobile' : DEVICES[i % DEVICES.length],
      status: i % 11 === 7 ? 'failed' : 'success',
      created_at: hoursAgo(i * 3 + 2),
    });
  }
  return logs;
}

const LOCATIONS: Record<string, string> = {
  'Phnom Penh': 'Phnom Penh, Cambodia',
  Kandal: 'Ta Khmau, Kandal',
  Battambang: 'Battambang, Cambodia',
  'Siem Reap': 'Siem Reap, Cambodia',
  'Kampong Speu': 'Chbar Mon, Kampong Speu',
};

export function seedLoginHistory(users: readonly UserRecord[]): LoginHistoryRecord[] {
  const { now, iso } = clock();
  const repProvince = new Map(salesReps.map((r) => [r.id, r.province]));
  const active = users.filter((u) => u.account_status !== 'disabled');
  const rows: LoginHistoryRecord[] = [];

  // The administrator's own devices: two still signed in, one older session.
  const own: [device: string, browser: string, os: string, hoursAgo: number, open: boolean][] = [
    ['Laptop', 'Chrome 129', 'macOS 15', 0.2, true],
    ['Mobile', 'Safari 18', 'iOS 18', 5, true],
    ['Desktop', 'Edge 129', 'Windows 11', 30, false],
  ];
  own.forEach(([device, browser, os, ago, open], i) => {
    const login = now - ago * HOUR;
    rows.push({
      id: `login-${String(i + 1).padStart(3, '0')}`,
      user_id: CURRENT_USER_ID,
      login_time: iso(login),
      logout_time: open ? null : iso(login + 3.5 * HOUR),
      device,
      browser,
      os,
      ip_address: `10.20.1.${15 + i}`,
      location: 'Phnom Penh, Cambodia',
      status: 'success',
      created_at: iso(login),
    });
  });

  for (let i = 0; i < 44; i += 1) {
    const user = active[(i * 7) % active.length];
    if (!user || user.id === CURRENT_USER_ID) continue;
    const isRep = repProvince.has(user.id);
    const login = now - (i * 4 + 1) * HOUR;
    const failed = user.account_status === 'locked' || i % 13 === 6;
    // The most recent sessions are still open, so there is something to revoke.
    const open = !failed && i < 8;
    rows.push({
      id: `login-${String(rows.length + 1).padStart(3, '0')}`,
      user_id: user.id,
      login_time: iso(login),
      logout_time: open || failed ? null : iso(login + (40 + (i % 6) * 50) * 60_000),
      device: isRep ? 'Mobile' : DEVICES[i % DEVICES.length],
      browser: isRep ? 'SteelForce Mobile 3.4' : BROWSERS[i % BROWSERS.length],
      os: isRep ? (i % 4 === 0 ? 'iOS 18' : 'Android 14') : i % 2 ? 'Windows 11' : 'macOS 15',
      ip_address: isRep ? `117.20.115.${40 + i}` : `10.20.1.${60 + (i % 40)}`,
      location: LOCATIONS[repProvince.get(user.id) ?? 'Phnom Penh'] ?? 'Phnom Penh, Cambodia',
      status: failed ? 'failed' : 'success',
      created_at: iso(login),
    });
  }
  return rows;
}
