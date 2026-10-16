'use client';

import { SidebarFlyout, useFlyout } from './sidebar-flyout';
import { Portal } from '@/components/ui/portal';
import { useAuth } from '@/lib/auth/auth-context';
import { roleMetaFor } from '@/lib/permissions';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Account area: the profile row and the sign-out action.
 *
 * Kept out of `NAV_SECTIONS` on purpose — one is a route and the other is a
 * destructive command, so neither belongs in the scrolling module list.
 */
export function SidebarFooter({
  collapsed,
  labelOf,
  onNavigate,
}: {
  collapsed: boolean;
  labelOf: (key: string, fallback: string) => string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const logoutRef = useRef<HTMLDivElement>(null);
  const profileFlyout = useFlyout();
  const logoutFlyout = useFlyout();

  const profileActive = pathname === '/profile';
  const profileLabel = labelOf('nav.profile', 'Profile');
  const logoutLabel = labelOf('nav.logout', 'Logout');

  const handleSignOut = async () => {
    setConfirming(false);
    await signOut();
    toast.success(labelOf('logout.done', 'Signed out'), {
      description: labelOf('logout.doneDesc', 'Your session has been cleared.'),
    });
    router.replace('/login');
  };

  return (
    <div className="p-3 border-t border-surface space-y-0.5">
      {/* Profile */}
      <div
        ref={profileRef}
        className="relative"
        onMouseEnter={() => collapsed && profileFlyout.open(profileRef.current)}
        onMouseLeave={profileFlyout.close}
        onTouchStart={() => collapsed && profileFlyout.longPress(profileRef.current)}
        onTouchEnd={profileFlyout.close}
      >
        <Link
          href="/profile"
          onClick={onNavigate}
          aria-current={profileActive ? 'page' : undefined}
          className={`flex items-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            collapsed ? 'justify-center py-2.5' : 'gap-3 px-2 py-2'
          } ${
            profileActive
              ? 'sidebar-item-active text-white'
              : 'text-muted-foreground hover:bg-accent/50'
          }`}
        >
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative bg-cover bg-center ${
              profileActive ? 'bg-white/20' : 'gradient-primary'
            }`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <span className="text-white text-[11px] font-bold z-10">{user?.initials ?? '—'}</span>
            )}
          </span>
          {!collapsed && (
            <span className="flex-1 min-w-0">
              <span
                className={`block text-[12.5px] font-semibold truncate ${
                  profileActive ? 'text-white' : 'text-main'
                }`}
              >
                {user?.name ?? 'Signed out'}
              </span>
              <span
                className={`block text-[10px] truncate ${
                  profileActive ? 'text-white/80' : 'text-muted-foreground'
                }`}
              >
                {role ? roleMetaFor(role).label : ''}
              </span>
            </span>
          )}
        </Link>

        {collapsed && (
          <SidebarFlyout
            anchor={profileFlyout.anchor}
            open={profileFlyout.isOpen}
            onClose={profileFlyout.close}
          >
            <div className="glass rounded-xl px-3 py-2 card-shadow whitespace-nowrap">
              <span className="text-[12px] font-medium text-main">{profileLabel}</span>
            </div>
          </SidebarFlyout>
        )}
      </div>

      {/* Logout */}
      <div
        ref={logoutRef}
        className="relative"
        onMouseEnter={() => collapsed && logoutFlyout.open(logoutRef.current)}
        onMouseLeave={logoutFlyout.close}
        onTouchStart={() => collapsed && logoutFlyout.longPress(logoutRef.current)}
        onTouchEnd={logoutFlyout.close}
      >
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`w-full flex items-center rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 ${
            collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
          }`}
        >
          <LogOut size={18} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && (
            <span className="text-[13px] font-medium whitespace-nowrap">{logoutLabel}</span>
          )}
        </button>

        {collapsed && (
          <SidebarFlyout
            anchor={logoutFlyout.anchor}
            open={logoutFlyout.isOpen}
            onClose={logoutFlyout.close}
          >
            <div className="glass rounded-xl px-3 py-2 card-shadow whitespace-nowrap">
              <span className="text-[12px] font-medium text-main">{logoutLabel}</span>
            </div>
          </SidebarFlyout>
        )}
      </div>

      {/* Sign-out confirmation */}
      <Portal>
        <AnimatePresence>
          {confirming && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setConfirming(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.22, ease: EASE }}
                role="alertdialog"
                aria-modal="true"
                aria-label={logoutLabel}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(380px,calc(100vw-32px))] z-[91]"
              >
                <div className="bg-card-surface border border-surface rounded-[20px] card-shadow p-5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-3.5">
                    <LogOut size={19} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <h2 className="text-[15px] font-bold text-main">
                    {labelOf('logout.title', 'Sign out of SteelForce?')}
                  </h2>
                  <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                    {labelOf(
                      'logout.body',
                      'You will be returned to the sign-in screen. Unsaved plan changes are kept on this device.'
                    )}
                  </p>
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 h-10 rounded-xl border border-surface text-[12.5px] font-semibold text-main hover:bg-accent/50 active:scale-[0.98] transition-all"
                    >
                      {labelOf('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-semibold active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20"
                    >
                      {logoutLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
