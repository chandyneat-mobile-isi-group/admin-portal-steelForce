'use client';

import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLauncher } from '../../chrome/app-launcher';
import { BrandBar } from '../../chrome/brand-bar';
import { ContentArea } from '../../chrome/content-area';
import { GlobalSearch } from '../../chrome/global-search';
import { HeaderActions } from '../../chrome/header-actions';
import { PageTitle } from '../../chrome/page-title';
import { AppTabs, NavTree } from '../../chrome/nav-tree';
import { useShellChrome } from '@/hooks/use-shell-chrome';
import type { ShellProps } from '../types';

const RAIL_WIDTH = 232;

/**
 * Modular ERP — pick an application in the top bar, then work inside it.
 *
 * Denser than Ecosystem and narrower than Workspace: the left rail lists only
 * the current application's pages, so the navigation stays short however large
 * the product grows. Built for operational work inside one module at a time —
 * quotations all morning, then inventory all afternoon.
 *
 * Both the app tabs and the rail read the permission-filtered navigation tree,
 * so scoping is presentation, never access.
 */
export function ModularERPLayout({ children, profileMenu, notifications }: ShellProps) {
  const { mobileOpen, openMobile, closeMobile } = useShellChrome();

  return (
    <div className="flex min-h-screen flex-col bg-surface [--shell-header:56px]">
      <header className="glass sticky top-0 z-30 border-b border-surface">
        <div className="flex h-[56px] items-center gap-3 px-3 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={openMobile}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent lg:hidden"
          >
            <Menu size={19} />
          </button>

          <BrandBar variant="monogram" />
          <AppLauncher />

          <div className="hidden min-w-0 flex-1 lg:block">
            <AppTabs />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-56 xl:block">
              <GlobalSearch />
            </div>
            <HeaderActions profileMenu={profileMenu} notifications={notifications} />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop rail — scoped to the active application. */}
        <aside
          style={{ width: RAIL_WIDTH }}
          className="sticky top-[56px] hidden h-[calc(100vh-56px)] flex-shrink-0 overflow-y-auto border-r border-surface bg-sidebar lg:block"
        >
          <NavTree />
        </aside>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMobile}
                className="fixed inset-0 z-50 bg-isi-ironclad/45 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -286 }}
                animate={{ x: 0 }}
                exit={{ x: -286 }}
                transition={{ type: 'spring', damping: 32, stiffness: 340 }}
                className="fixed left-0 top-0 z-50 flex h-full w-[286px] flex-col border-r border-surface bg-sidebar lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-surface px-4 py-3.5">
                  <BrandBar variant="monogram" showSwitcher={false} />
                  <button
                    type="button"
                    onClick={closeMobile}
                    aria-label="Close navigation"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="border-b border-surface p-3">
                    <AppTabs />
                  </div>
                  <NavTree onNavigate={closeMobile} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* An action bar rather than a second header: title and breadcrumb
              only, so the working area starts as high up the page as possible. */}
          <div className="flex items-center justify-between gap-4 border-b border-surface bg-card/50 px-4 py-2.5 sm:px-5">
            <PageTitle />
          </div>

          <ContentArea width="full" padding="tight">
            {children}
          </ContentArea>
        </div>
      </div>
    </div>
  );
}
