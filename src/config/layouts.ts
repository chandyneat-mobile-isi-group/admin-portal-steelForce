import { LayoutGrid, LayoutPanelLeft, PanelsTopLeft, type LucideIcon } from 'lucide-react';
import type { LayoutId } from '@/domain/enums/layout';

/**
 * The layout registry — the one place a shell is described.
 *
 * `config/` holds policy data rather than algorithms (see ADR 006), and this is
 * policy: which shells exist, how they are named to users, and in what order
 * they are offered. Renaming a layout is a change here plus a locale string,
 * never a change in a component.
 *
 * `labelKey`/`descriptionKey` resolve through i18n; `label`/`description` are
 * the English fallbacks used when a key is missing, matching the convention in
 * `config/navigation.ts`.
 */
export interface LayoutOption {
  id: LayoutId;
  labelKey: string;
  label: string;
  descriptionKey: string;
  description: string;
  icon: LucideIcon;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'ecosystem',
    labelKey: 'layout.ecosystem.label',
    label: 'Ecosystem',
    descriptionKey: 'layout.ecosystem.description',
    description: 'Modern application ecosystem',
    icon: LayoutGrid,
  },
  {
    id: 'modular',
    labelKey: 'layout.modular.label',
    // Named for what it is rather than for the product that inspired it — the
    // description carries the reference.
    label: 'Modular ERP',
    descriptionKey: 'layout.modular.description',
    description: 'Odoo-inspired modular workspace',
    icon: PanelsTopLeft,
  },
  {
    id: 'workspace',
    labelKey: 'layout.workspace.label',
    label: 'CRM System Layout',
    descriptionKey: 'layout.workspace.description',
    description: 'Enterprise productivity',
    icon: LayoutPanelLeft,
  },
];

export function layoutOption(id: LayoutId): LayoutOption {
  return LAYOUT_OPTIONS.find((option) => option.id === id) ?? LAYOUT_OPTIONS[2];
}
