import { Banknote, ShoppingBasket, Users2, type LucideIcon } from 'lucide-react';
import {
  isNavGroup,
  navigationFor,
  type NavGroup,
  type NavLeaf,
} from '@/config/navigation';
import type { Permission } from '@/lib/auth/types';

/**
 * "Applications" for the app-centric shells.
 *
 * Deliberately *derived* from `NAV_SECTIONS` rather than declared again. A tile
 * is a navigation group (or a standalone leaf) wearing a different presentation
 * — so route, icon, label and permission keep exactly one source of truth, and
 * a module the session cannot reach never becomes a tile, because
 * `navigationFor()` already removed it. There is no second permission check
 * here, and there must never be one.
 */

export interface AppTile {
  id: string;
  labelKey: string;
  label: string;
  /** A group opens at its first accessible child. */
  href: string;
  icon: LucideIcon;
  children: NavLeaf[];
  sectionId: string;
  status: 'available';
}

/**
 * Modules on the roadmap that have no route, page or permission yet.
 *
 * Rendered as visibly disabled tiles so the ecosystem reads as a whole
 * platform. They are inert by construction — no `href` exists to navigate to.
 * Delete an entry here the day the real module lands in `navigation.ts`.
 */
export interface RoadmapTile {
  id: string;
  labelKey: string;
  label: string;
  icon: LucideIcon;
  status: 'planned';
}

export const ROADMAP_APPS: RoadmapTile[] = [];

function toTile(node: NavGroup | NavLeaf, sectionId: string): AppTile | null {
  if (isNavGroup(node)) {
    const first = node.children[0];
    if (!first) return null;
    return {
      id: node.id,
      labelKey: node.labelKey,
      label: node.label,
      href: first.href,
      icon: node.icon,
      children: node.children,
      sectionId,
      status: 'available',
    };
  }
  return {
    id: node.id,
    labelKey: node.labelKey,
    label: node.label,
    href: node.href,
    icon: node.icon,
    children: [node],
    sectionId,
    status: 'available',
  };
}

/** The applications this session may open, in navigation order. */
export function applicationsFor(permissions: readonly Permission[] | null): AppTile[] {
  return navigationFor(permissions).flatMap((section) =>
    section.nodes.reduce<AppTile[]>((tiles, node) => {
      const tile = toTile(node, section.id);
      if (tile) tiles.push(tile);
      return tiles;
    }, [])
  );
}

/** The application that owns a pathname, for module-scoped navigation. */
export function applicationForPath(apps: AppTile[], pathname: string): AppTile | null {
  let best: { app: AppTile; score: number } | null = null;
  for (const app of apps) {
    for (const child of app.children) {
      const exact = pathname === child.href;
      const prefixed = pathname.startsWith(`${child.href}/`);
      if (!exact && !prefixed) continue;
      const score = exact ? child.href.length + 1000 : child.href.length;
      if (!best || score > best.score) best = { app, score };
    }
  }
  return best?.app ?? null;
}
