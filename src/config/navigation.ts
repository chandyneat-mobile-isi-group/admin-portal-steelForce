import {
  BarChart3,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  List,
  Map,
  MapPin,
  Navigation,
  Package,
  Route,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Store,
  type LucideIcon,
  ClipboardCheck,
  FileCheck,
  FileSpreadsheet,
  BadgePercent,
  Tags,
  SlidersHorizontal,
} from 'lucide-react';
import { hasPermission } from '@/domain/permissions';
import { isEnabled, type FeatureFlag } from '@/config/features';
import type { Permission } from '@/lib/auth/types';

/**
 * Single source of truth for the portal's navigation.
 *
 * Every menu entry — label, icon, route, nesting and ordering — is declared
 * here. The sidebar renders whatever this file describes, so adding a module
 * means adding one object, not touching UI code.
 */

export interface NavLeaf {
  kind: 'leaf';
  id: string;
  /** i18n key; `label` is the English fallback when a key is missing. */
  labelKey: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see this item and open its route. */
  permission: Permission;
  /**
   * When true the item also matches deeper paths (`/planning/board`).
   * A more specific sibling still wins — see `resolveActiveNav`.
   */
  matchPrefix?: boolean;
  /** When set, the item is shown only while this feature flag is enabled. */
  feature?: FeatureFlag;
}

export interface NavGroup {
  kind: 'group';
  id: string;
  labelKey: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
  /** When set, the whole group (and every child) is shown only while this flag is enabled. */
  feature?: FeatureFlag;
}

export type NavNode = NavLeaf | NavGroup;

export interface NavSection {
  id: string;
  labelKey: string;
  label: string;
  nodes: NavNode[];
}

const leaf = (
  id: string,
  label: string,
  href: string,
  icon: LucideIcon,
  permission: Permission,
  matchPrefix = false
): NavLeaf => ({
  kind: 'leaf',
  id,
  labelKey: `nav.${id}`,
  label,
  href,
  icon,
  permission,
  matchPrefix,
});

const group = (id: string, label: string, icon: LucideIcon, children: NavLeaf[]): NavGroup => ({
  kind: 'group',
  id,
  labelKey: `nav.${id}`,
  label,
  icon,
  children,
});

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    labelKey: 'nav.section.main',
    label: 'Main Menu',
    nodes: [
      leaf('dashboard', 'Dashboard', '/dashboard', LayoutDashboard, 'dashboard.view'),

      {
        ...group('approval', 'Approval', ClipboardCheck, [
          // The hub first: it is the only screen that shows all three queues at once, and
          // a reviewer opening "Approval" almost always wants "what is waiting for me"
          // rather than one named category.
          leaf('approvalAll', 'All approvals', '/approval', ClipboardCheck, 'sales.manage'),
          leaf('approvalQuotations', 'Quotations', '/approval/quotations', FileCheck, 'sales.manage'),
          leaf('approvalPromotions', 'Promotions & Discount', '/approval/promotions', BadgePercent, 'sales.manage'),
          leaf('approvalDepots', 'Depots', '/approval/depots', Store, 'customers.manage'),
        ]),
        feature: 'approvalModule',
      },

      group('depots', 'Depots', Users, [
        leaf('depotsList', 'Depots', '/depots', List, 'customers.view'),
        leaf('nonBpDepots', 'NON-BP Depots', '/depots/non-bp', Boxes, 'customers.view'),
        leaf('myDepots', 'My Depots', '/depots/my', Star, 'customers.view'),
        leaf('newDepot', 'New Depot', '/depots/new', UserPlus, 'customers.manage'),
        {
          ...leaf('depotAssignments', 'Depot Assignment', '/depots/assignments', FileSpreadsheet, 'routes.manage'),
          feature: 'depotAssignmentsModule',
        },
      ]),

      {
        ...group('sales', 'Sales', TrendingUp, [
          leaf('quotations', 'Quotations', '/quotations', FileText, 'sales.view'),
          leaf('orders', 'Orders', '/orders', ShoppingCart, 'sales.view'),
        ]),
        feature: 'salesModule',
      },

      leaf('promotions', 'Promotions & Discounts', '/promotions', Tags, 'sales.manage'),
      // Types and condition definitions behind the promotion form — catalogue data, so
      // only `promotions.configure` maintains them.
      leaf('promotionConfig', 'Promotion Settings', '/promotions/configuration', SlidersHorizontal, 'promotions.configure', true),

      { ...leaf('materials', 'Materials', '/materials', Package, 'products.view', true), feature: 'materialsModule' },
    ],
  },
  {
    id: 'operations',
    labelKey: 'nav.section.operations',
    label: 'Operations',
    nodes: [
      group('fieldOps', 'Visit Operation', Route, [
        // `/planning` owns its sub-tabs.
        leaf('planning', 'Planning', '/planning', CalendarRange, 'visits.view', true),
        leaf('salesReps', 'Sales Reps', '/sales-reps', UserCheck, 'visits.view', true),
        { ...leaf('visits', 'Visits', '/visits', MapPin, 'visits.view'), feature: 'visitsModule' },
      ]),

      group('reports', 'Reports', BarChart3, [
        leaf('salesReport', 'Sales Report', '/reports/sales', TrendingUp, 'reports.view'),
        leaf('visitReport', 'Visit Report', '/reports/visits', Map, 'reports.view'),
        leaf('performance', 'Performance', '/reports/performance', Gauge, 'reports.view'),
      ]),
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.section.system',
    label: 'System',
    nodes: [
      group('administration', 'Administration', ShieldCheck, [
        leaf('userManagement', 'User Management', '/user-management', UserCog, 'users.read', true),
        leaf('rolesPermissions', 'Sessions & devices', '/user-management/sessions-devices', KeyRound, 'roles.read'),
        leaf('settings', 'Settings', '/settings', Settings, 'settings.manage'),
      ]),
    ],
  },
];

export function isNavGroup(node: NavNode): node is NavGroup {
  return node.kind === 'group';
}

/** Flat list of every leaf, used for active resolution and route checks. */
export const NAV_LEAVES: NavLeaf[] = NAV_SECTIONS.flatMap((section) =>
  section.nodes.flatMap((node) => (isNavGroup(node) ? node.children : [node]))
);

export interface ActiveNav {
  leafId: string | null;
  groupId: string | null;
  sectionId: string | null;
}

/**
 * Resolves the highlighted item for a pathname.
 *
 * Matching is longest-wins so that a specific child (`/planning/map` → Routes,
 * `/user-management/roles` → Roles & Permissions) beats the prefix-matching
 * parent that would otherwise also claim the path.
 */
export function resolveActiveNav(pathname: string): ActiveNav {
  let best: { leaf: NavLeaf; score: number } | null = null;

  for (const section of NAV_SECTIONS) {
    for (const node of section.nodes) {
      const candidates = isNavGroup(node) ? node.children : [node];
      for (const item of candidates) {
        const exact = pathname === item.href;
        const prefixed = item.matchPrefix && pathname.startsWith(`${item.href}/`);
        if (!exact && !prefixed) continue;
        // Exact beats prefix; between prefixes the longer href wins.
        const score = exact ? item.href.length + 1000 : item.href.length;
        if (!best || score > best.score) best = { leaf: item, score };
      }
    }
  }

  if (!best) return { leafId: null, groupId: null, sectionId: null };

  for (const section of NAV_SECTIONS) {
    for (const node of section.nodes) {
      if (isNavGroup(node)) {
        if (node.children.some((child) => child.id === best!.leaf.id)) {
          return { leafId: best.leaf.id, groupId: node.id, sectionId: section.id };
        }
      } else if (node.id === best.leaf.id) {
        return { leafId: best.leaf.id, groupId: null, sectionId: section.id };
      }
    }
  }

  return { leafId: best.leaf.id, groupId: null, sectionId: null };
}

/**
 * Authorization-aware view of the menu.
 *
 * Unauthorized items are removed, not disabled — a Finance user has no reason
 * to see that Field Operations exists. A group disappears once none of its
 * children survive, so no empty headers are left behind.
 *
 * Takes the session's own permission list (`isi:permission` claims), not a
 * role — matching Authorization.md's rule that access decisions run on
 * permissions, never role names. `null` (signed out) hides everything.
 *
 * A node whose `feature` flag is disabled is dropped the same way, before any
 * permission check — hiding a group hides all of its children with it.
 */
export function navigationFor(permissions: readonly Permission[] | null): NavSection[] {
  if (!permissions) return [];
  return NAV_SECTIONS.map((section) => ({
    ...section,
    nodes: section.nodes.reduce<NavNode[]>((nodes, node) => {
      if (node.feature && !isEnabled(node.feature)) return nodes;
      if (isNavGroup(node)) {
        const children = node.children.filter(
          (child) => (!child.feature || isEnabled(child.feature)) && hasPermission(permissions, child.permission)
        );
        if (children.length > 0) nodes.push({ ...node, children });
      } else if (hasPermission(permissions, node.permission)) {
        nodes.push(node);
      }
      return nodes;
    }, []),
  })).filter((section) => section.nodes.length > 0);
}
export interface BreadcrumbCrumb {
  labelKey: string;
  label: string;
  /** Absent for a group, which is a heading rather than a destination. */
  href?: string;
}

/**
 * The trail for a pathname: section → group → leaf, whichever exist.
 *
 * Derived from the same tree the sidebar renders, so a page's title can never
 * disagree with the menu item that leads to it. This replaced a hand-kept map
 * of 16 routes in the header, which had to be edited every time a module was
 * added and silently fell back to "Dashboard" when someone forgot.
 */
export function breadcrumbFor(pathname: string): BreadcrumbCrumb[] {
  const active = resolveActiveNav(pathname);
  if (!active.leafId) return [];

  const crumbs: BreadcrumbCrumb[] = [];
  const section = NAV_SECTIONS.find((s) => s.id === active.sectionId);
  if (section) crumbs.push({ labelKey: section.labelKey, label: section.label });

  if (active.groupId) {
    const group = section?.nodes.find(
      (node): node is NavGroup => isNavGroup(node) && node.id === active.groupId
    );
    if (group) crumbs.push({ labelKey: group.labelKey, label: group.label });
  }

  const leaf = NAV_LEAVES.find((l) => l.id === active.leafId);
  if (leaf) crumbs.push({ labelKey: leaf.labelKey, label: leaf.label, href: leaf.href });

  return crumbs;
}
