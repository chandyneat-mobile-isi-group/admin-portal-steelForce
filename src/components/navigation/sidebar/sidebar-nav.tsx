'use client';

import { navigationFor, isNavGroup } from '@/config/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useSidebarGroups } from '@/hooks/use-sidebar';
import { SidebarGroup } from './sidebar-group';
import { SidebarItem } from './sidebar-item';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Renders the navigation tree the signed-in user is allowed to see. Items the
 * session lacks permission for are absent from the DOM entirely, not disabled —
 * the filtering happens in `navigationFor`, against the same matrix the route
 * guard uses.
 */
export function SidebarNav({
  collapsed,
  labelOf,
  onNavigate,
}: {
  collapsed: boolean;
  labelOf: (key: string, fallback: string) => string;
  onNavigate?: () => void;
}) {
  const { isExpanded, toggleGroup, active } = useSidebarGroups();
  const { permissions } = useAuth();
  const sections = useMemo(() => navigationFor(permissions), [permissions]);

  return (
    <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className={sectionIndex > 0 ? 'mt-5' : ''}>
          {/* A divider stands in for the header on the collapsed rail, where
              there is no room for a caption but the grouping still helps. */}
          <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
              sectionIndex > 0 && (
                <motion.div
                  key={`${section.id}-rule`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto w-6 h-px bg-border mb-3"
                />
              )
            ) : (
              <motion.p
                key={`${section.id}-label`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {labelOf(section.labelKey, section.label)}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="space-y-0.5">
            {section.nodes.map((node, index) =>
              isNavGroup(node) ? (
                <SidebarGroup
                  key={node.id}
                  group={node}
                  labelOf={labelOf}
                  expanded={isExpanded(node.id)}
                  onToggle={() => toggleGroup(node.id)}
                  activeLeafId={active.leafId}
                  containsActive={active.groupId === node.id}
                  collapsed={collapsed}
                  index={index}
                  onNavigate={onNavigate}
                />
              ) : (
                <SidebarItem
                  key={node.id}
                  item={node}
                  label={labelOf(node.labelKey, node.label)}
                  active={active.leafId === node.id}
                  collapsed={collapsed}
                  index={index}
                  onNavigate={onNavigate}
                />
              )
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}
