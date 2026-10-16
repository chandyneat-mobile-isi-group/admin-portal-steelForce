'use client';

import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLauncher } from '../../chrome/app-launcher';
import { BrandBar } from '../../chrome/brand-bar';
import { ContentArea } from '../../chrome/content-area';
import { GlobalSearch } from '../../chrome/global-search';
import { HeaderActions } from '../../chrome/header-actions';
import { PageTitle } from '../../chrome/page-title';
import { EcosystemAppRail } from './ecosystem-app-rail';
import { useShellChrome } from '@/hooks/use-shell-chrome';
import type { ShellProps } from '../types';

/**
 * Ecosystem — the app-centric shell.
 *
 * One top bar carries the brand, the layout switcher and the launcher; there is
 * no permanent side navigation, so a page gets the full width and the user
 * moves between applications rather than drilling a tree. Built for someone who
 * works across modules rather than inside one.
 *
 * On mobile the rail becomes a sheet, because a horizontal app strip and a
 * phone are a bad trade.
 */
export function EcosystemLayout({ children, profileMenu, notifications }: ShellProps) {
  const { mobileOpen, openMobile, closeMobile } = useShellChrome();

  return (
    <div className="flex min-h-screen flex-col bg-surface [--shell-header:64px]">
      <header className="glass sticky top-0 z-30 border-b border-surface">
        <div className="mx-auto flex h-[64px] w-full max-w-[1760px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={openMobile}
            aria-label="Open applications"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent lg:hidden"
          >
            <Menu size={19} />
          </button>

          <BrandBar />

          <div className="hidden lg:block">
            <AppLauncher />
          </div>

          <div className="mx-auto hidden w-full max-w-lg md:block">
            <GlobalSearch />
          </div>

          <div className="ml-auto md:ml-0">
            <HeaderActions profileMenu={profileMenu} notifications={notifications} />
          </div>
        </div>

        {/* The current page still needs naming — the app strip says where you
            are at module level, this says where you are inside it. */}
        <div className="mx-auto hidden w-full max-w-[1760px] items-center justify-between gap-4 border-t border-surface px-4 py-2 sm:px-6 lg:flex lg:px-8">
          <PageTitle />
          <EcosystemAppRail />
        </div>
      </header>

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
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed left-0 top-0 z-50 flex h-full w-[286px] flex-col border-r border-surface bg-sidebar lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-surface px-4 py-4">
                <BrandBar showSwitcher={false} />
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Close applications"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <EcosystemAppRail orientation="vertical" onNavigate={closeMobile} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ContentArea width="wide">{children}</ContentArea>
    </div>
  );
}
