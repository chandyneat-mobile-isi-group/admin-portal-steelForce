'use client';

import type { NavLeaf } from '@/config/navigation';
import { SidebarFlyout, useFlyout } from './sidebar-flyout';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A single navigable row.
 *
 * `depth` drives the two visual registers: top level rows carry an icon tile,
 * nested rows sit against an indent guide so the hierarchy reads without extra
 * chrome. The active row gets the brand gradient plus an accent bar in the
 * rail gutter, which slides between rows via a shared `layoutId`.
 */
export function SidebarItem({
  item,
  label,
  active,
  collapsed,
  depth = 0,
  index = 0,
  onNavigate,
}: {
  item: NavLeaf;
  label: string;
  active: boolean;
  collapsed: boolean;
  depth?: 0 | 1;
  index?: number;
  onNavigate?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const flyout = useFlyout();
  const Icon = item.icon;
  const nested = depth === 1;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => collapsed && flyout.open(ref.current)}
      onMouseLeave={() => collapsed && flyout.close()}
      onTouchStart={() => collapsed && flyout.longPress(ref.current)}
      onTouchEnd={flyout.close}
    >
      {active && !collapsed && (
        <motion.span
          layoutId="sidebar-active-accent"
          transition={{ type: 'spring', stiffness: 480, damping: 38 }}
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
        />
      )}

      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? label : undefined}
        className={`group relative flex items-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
        } ${
          active
            ? 'sidebar-item-active text-white'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-primary'
        }`}
      >
        {nested && !collapsed && !active && (
          <span className="absolute left-[9px] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary/60 transition-colors" />
        )}

        <Icon
          size={18}
          strokeWidth={active ? 2.4 : 1.8}
          className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            nested && !collapsed ? 'ml-4' : ''
          } ${active ? 'text-white' : ''}`}
        />

        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.015, ease: EASE }}
            className={`text-[13px] whitespace-nowrap truncate ${
              active ? 'font-semibold' : 'font-medium'
            }`}
          >
            {label}
          </motion.span>
        )}
      </Link>

      {/* Collapsed rail: the label lives in a flyout instead of beside the icon */}
      {collapsed && (
        <SidebarFlyout anchor={flyout.anchor} open={flyout.isOpen} onClose={flyout.close}>
          <div className="glass rounded-xl px-3 py-2 card-shadow whitespace-nowrap">
            <span className="text-[12px] font-medium text-main">{label}</span>
          </div>
        </SidebarFlyout>
      )}
    </div>
  );
}
