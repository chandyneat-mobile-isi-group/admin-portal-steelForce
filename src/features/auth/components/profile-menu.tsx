'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { roleMetaFor } from '@/lib/permissions';
import { Portal } from '@/components/ui/portal';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Header account menu: identity, role badge, profile link and sign-out.
 *
 * Sign-out routes through the same confirmation and the same `signOut` on the
 * auth context as the sidebar, so there is one logout path, not two.
 */
export function ProfileMenu() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user || !role) return null;
  const meta = roleMetaFor(role);

  const handleSignOut = async () => {
    setConfirming(false);
    setOpen(false);
    await signOut();
    toast.success('Signed out', { description: 'Your session has been cleared.' });
    router.replace('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 pl-1 pr-2 sm:pr-2.5 py-1.5 rounded-xl hover:bg-accent/30 transition-colors duration-200"
      >
        <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0 overflow-hidden relative bg-cover bg-center">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <span className="text-white text-xs font-bold z-10">{user.initials}</span>
          )}
        </span>
        <span className="hidden sm:block text-left min-w-0">
          <span className="block text-[12px] font-semibold text-main leading-tight truncate">
            {user.name}
          </span>
          <span className="block text-[10px] text-muted-foreground truncate">{meta.label}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            role="menu"
            className="absolute right-0 top-12 w-72 glass rounded-card card-shadow p-3 z-50 origin-top-right"
          >
            <div className="flex items-start gap-3 pb-3 border-b border-surface">
              <span className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 overflow-hidden relative bg-cover bg-center">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <span className="text-white text-[14px] font-bold z-10">{user.initials}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-main truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <Mail size={10} /> {user.email}
                </p>
                <span
                  className={`inline-flex items-center mt-1.5 px-2 py-[3px] rounded-full border text-[10px] font-semibold ${meta.badge}`}
                >
                  {meta.label}
                </span>
              </div>
            </div>

            <p className="text-[10.5px] text-muted-foreground leading-relaxed py-2.5">
              {meta.description}
            </p>

            <div className="space-y-0.5 pt-1 border-t border-surface">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-main hover:bg-accent/50 transition-colors"
              >
                <User size={15} className="text-muted-foreground" /> View profile
              </Link>
              <button
                onClick={() => setConfirming(true)}
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="fixed inset-0 z-[91] flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 14 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  role="alertdialog"
                  aria-modal="true"
                  aria-label="Sign out"
                  className="w-[min(380px,calc(100vw-32px))] pointer-events-auto"
                >
                <div className="bg-card-surface border border-surface rounded-card card-shadow p-5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-3.5">
                    <LogOut size={19} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <h2 className="text-[15px] font-bold text-main">Sign out of SteelForce?</h2>
                  <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                    You will be returned to the sign-in screen.
                  </p>
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 h-10 rounded-xl border border-surface text-[12.5px] font-semibold text-main hover:bg-accent/50 active:scale-[0.98] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-semibold active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
