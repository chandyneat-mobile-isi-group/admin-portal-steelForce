'use client';

import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/navigation/sidebar';
import { ContentArea } from '../../chrome/content-area';
import { GlobalSearch } from '../../chrome/global-search';
import { HeaderActions } from '../../chrome/header-actions';
import { PageTitle } from '../../chrome/page-title';
import { useShellChrome } from '@/hooks/use-shell-chrome';
import type { ShellProps } from '../types';

/**
 * ERP Workspace — the portal's original shell, and the default.
 *
 * Persistent left navigation, a dense header, maximum content width. Built for
 * someone who is in the system all day and navigates by muscle memory: the tree
 * never moves, and `Cmd/Ctrl+B` collapses it to an icon rail without losing
 * position.
 *
 * The navigation itself is the existing `Sidebar`, unchanged. Only the header
 * was rebuilt from the shared chrome primitives.
 */
export function ERPWorkspaceLayout({ children, profileMenu, notifications }: ShellProps) {
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapse } = useShellChrome();

  return (
    <div className="relative flex min-h-screen bg-surface">
      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={closeMobile}
          collapsed={collapsed}
          toggleCollapse={toggleCollapse}
        />

        <div className="flex min-w-0 flex-1 flex-col [--shell-header:72px]">
          <header className="glass sticky top-0 z-30 h-[72px] border-b border-surface">
            <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={openMobile}
                  aria-label="Open navigation"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent lg:hidden"
                >
                  <Menu size={19} />
                </button>
                <PageTitle />
              </div>

              <div className="mx-auto hidden max-w-md flex-1 md:flex">
                <GlobalSearch />
              </div>

              <HeaderActions profileMenu={profileMenu} notifications={notifications} />
            </div>
          </header>

          <ContentArea width="wide">{children}</ContentArea>
        </div>
      </div>
    </div>
  );
}
