'use client';

import { SidebarNav } from './sidebar-nav';
import { SidebarFooter } from './sidebar-footer';
import { useI18n } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { LayoutSwitcher } from '@/components/layout/layout-switcher';
import Image from 'next/image';
import { useCallback } from 'react';

const EXPANDED_WIDTH = 280;
const RAIL_WIDTH = 80;
/** Brief matches the shell's own motion language: 250ms on an ease-out curve. */
const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
}

/**
 * Application navigation.
 *
 * Three surfaces share one tree: the expanded desktop panel, the 80px icon
 * rail, and the mobile drawer (always expanded — a rail on a phone-sized
 * overlay would trade clarity for nothing). All of them render `SidebarNav`,
 * which reads `NAV_SECTIONS`.
 */
export function Sidebar({ mobileOpen, onClose, collapsed, toggleCollapse }: SidebarProps) {
  const { t } = useI18n();

  // `t` echoes the key back when a string is missing; fall back to the model's
  // English label so a new module is never rendered as `nav.someKey`.
  const labelOf = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const panel = (isCollapsed: boolean, onNavigate?: () => void) => (
    <>
      <SidebarBrand
        collapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        appName={t('app.name')}
        portal={t('app.portal')}
      />
      <SidebarNav collapsed={isCollapsed} labelOf={labelOf} onNavigate={onNavigate} />
      {isCollapsed && (
        <div className="flex justify-center pt-2">
          <LayoutSwitcher compact />
        </div>
      )}
      {isCollapsed && (
        <div className="px-3 pb-1">
          <button
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-primary transition-colors duration-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      <SidebarFooter collapsed={isCollapsed} labelOf={labelOf} onNavigate={onNavigate} />
    </>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        animate={{ width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
        transition={TRANSITION}
        className="hidden lg:flex flex-col bg-sidebar border-r border-surface card-shadow fixed left-0 top-0 h-screen z-20 overflow-hidden"
      >
        {panel(collapsed)}
      </motion.aside>

      {/* Spacer keeps the content column in step with the fixed rail */}
      <motion.div
        animate={{ width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
        transition={TRANSITION}
        className="hidden lg:block flex-shrink-0"
      />

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -EXPANDED_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -EXPANDED_WIDTH }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-sidebar border-r border-surface z-50 lg:hidden flex flex-col"
            >
              <button
                onClick={onClose}
                aria-label="Close navigation"
                className="absolute top-5 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors z-10"
              >
                <X size={18} />
              </button>
              {panel(false, onClose)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarBrand({
  collapsed,
  toggleCollapse,
  appName,
  portal,
}: {
  collapsed: boolean;
  toggleCollapse: () => void;
  appName: string;
  portal: string;
}) {
  return (
    <div
      className={`flex items-center px-4 py-5 border-b border-surface ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 flex items-center py-1"
            >
              <Image 
                src="/logos/isi-steel-dark.svg"
                alt="ISI Steel"
                width={130}
                height={42}
                className="object-contain dark:hidden"
                priority
              />
              <Image 
                src="/logos/isi-steel-light.svg"
                alt="ISI Steel"
                width={130}
                height={42}
                className="hidden dark:block object-contain"
                priority
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            >
              <Image 
                src="/logos/isi-monogram-dark.svg"
                alt="ISI"
                width={36}
                height={36}
                className="object-contain dark:hidden"
                priority
              />
              <Image 
                src="/logos/isi-monogram-light.svg"
                alt="ISI"
                width={36}
                height={36}
                className="hidden dark:block object-contain"
                priority
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!collapsed && (
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {/* Beside the mark, as in every other shell. */}
          <LayoutSwitcher compact />
          <button
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-muted-foreground hover:bg-accent/50 hover:text-primary transition-colors duration-200 flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
