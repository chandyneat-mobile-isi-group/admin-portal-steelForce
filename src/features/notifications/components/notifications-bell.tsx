'use client';

import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { notificationActions, relativeTime, useNotifications } from '../store';

/**
 * Header bell. Reads the same store as the notification centre, so the badge,
 * this preview and `/notifications` always agree.
 */
export function NotificationsBell() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { items, unreadCount } = useNotifications();
  const preview = items.slice(0, 5);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount ? `${t('header.notifications')} (${unreadCount} unread)` : t('header.notifications')}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold leading-none text-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-11 z-50 w-80 rounded-card border border-border bg-popover p-3 shadow-isi-lg"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-bold text-foreground">
                  {t('header.notifications')}
                  {unreadCount > 0 && <span className="ml-1.5 font-medium text-muted-foreground">· {unreadCount} unread</span>}
                </p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => notificationActions.markAllRead()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {preview.length === 0 && (
                  <p className="py-6 text-center text-[12px] text-muted-foreground">You&apos;re all caught up.</p>
                )}
                {preview.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => {
                      notificationActions.setUnread(n.id, false);
                      setOpen(false);
                      router.push(n.href);
                    }}
                    className="flex w-full cursor-pointer items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-accent"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${n.unread ? 'bg-primary' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12px] text-foreground ${n.unread ? 'font-semibold' : 'font-medium'}`}>{n.title}</span>
                      <span className="block text-[11px] text-muted-foreground line-clamp-2">{n.desc}</span>
                    </span>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{relativeTime(n.at)}</span>
                  </button>
                ))}
              </div>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-1.5 border-t border-border pt-2.5 text-[11.5px] font-medium text-primary hover:underline"
              >
                {t('header.viewAllNotifications')} <ChevronRight size={12} />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
