'use client';

import type { NavGroup } from '@/config/navigation';
import { SidebarItem } from './sidebar-item';
import { SidebarFlyout, useFlyout } from './sidebar-flyout';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Matches the rail's own collapse timing so the whole panel moves as one. */
const EXPAND_MS = 0.25;

export function SidebarGroup({
  group,
  labelOf,
  expanded,
  onToggle,
  activeLeafId,
  containsActive,
  collapsed,
  index,
  onNavigate,
}: {
  group: NavGroup;
  labelOf: (key: string, fallback: string) => string;
  expanded: boolean;
  onToggle: () => void;
  activeLeafId: string | null;
  containsActive: boolean;
  collapsed: boolean;
  index: number;
  onNavigate?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const flyout = useFlyout();
  const Icon = group.icon;
  const label = labelOf(group.labelKey, group.label);

  // Collapsed rail: the group becomes an icon that opens its children in a
  // hover flyout, so the hierarchy survives at 80px wide.
  if (collapsed) {
    return (
      <div
        ref={ref}
        className="relative"
        onMouseEnter={() => flyout.open(ref.current)}
        onMouseLeave={flyout.scheduleClose}
        onTouchStart={() => flyout.longPress(ref.current)}
      >
        <button
          type="button"
          onClick={() => flyout.open(ref.current)}
          aria-label={label}
          aria-expanded={flyout.isOpen}
          className={`w-full flex items-center justify-center py-2.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            containsActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-primary'
          }`}
        >
          <Icon size={18} strokeWidth={containsActive ? 2.4 : 1.8} />
        </button>

        {containsActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
        )}

        {group.id === 'approval' && (
          <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-bounce" />
        )}

        <SidebarFlyout
          anchor={flyout.anchor}
          open={flyout.isOpen}
          onClose={flyout.close}
          interactive
        >
          <div
            onMouseEnter={() => flyout.open(ref.current)}
            onMouseLeave={flyout.scheduleClose}
            className="glass rounded-2xl card-shadow p-2 min-w-[210px]"
          >
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <div className="space-y-0.5">
              {group.children.map((child) => {
                const ChildIcon = child.icon;
                const active = activeLeafId === child.id;
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    onClick={() => {
                      flyout.close();
                      onNavigate?.();
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] transition-colors duration-150 ${
                      active
                        ? 'sidebar-item-active text-white font-semibold'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-primary font-medium'
                    }`}
                  >
                    <ChildIcon size={15} strokeWidth={active ? 2.4 : 1.8} />
                    <span className="whitespace-nowrap">
                      {labelOf(child.labelKey, child.label)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </SidebarFlyout>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.28, ease: EASE }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          containsActive && !expanded
            ? 'text-primary bg-primary/5'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-primary'
        }`}
      >
        <Icon
          size={18}
          strokeWidth={containsActive ? 2.2 : 1.8}
          className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        />
        <span
          className={`flex-1 text-left text-[13px] whitespace-nowrap truncate flex items-center gap-2 ${
            containsActive ? 'font-semibold' : 'font-medium'
          }`}
        >
          {label}
          {group.id === 'approval' && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm animate-pulse">
              3
            </span>
          )}
        </span>
        {containsActive && !expanded && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: EXPAND_MS, ease: EASE }}
          className="flex-shrink-0"
        >
          <ChevronDown size={14} strokeWidth={2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: EXPAND_MS, ease: EASE }}
            className="overflow-hidden"
          >
            {/* Indent guide: one hairline instead of a border on every child */}
            <div className="relative mt-0.5 space-y-0.5 pb-1">
              <span className="absolute left-[21px] top-1 bottom-2 w-px bg-border" />
              {group.children.map((child, i) => (
                <SidebarItem
                  key={child.id}
                  item={child}
                  label={labelOf(child.labelKey, child.label)}
                  active={activeLeafId === child.id}
                  collapsed={false}
                  depth={1}
                  index={i}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
