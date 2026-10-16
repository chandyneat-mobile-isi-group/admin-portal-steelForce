'use client';

import { useMemo } from 'react';
import { createObservableStore, useObservableStore } from '@/hooks/use-observable-store';
import { buildNotifications, DEMO_NOW, type PortalNotification } from './data/notifications';

/**
 * One persisted feed shared by the header bell and the notification centre, so
 * reading, deleting or "mark all read" in either place updates both.
 */
export const notificationsStore = createObservableStore<PortalNotification[]>('notifications', buildNotifications);

export const notificationActions = {
  setUnread(id: string, unread: boolean) {
    notificationsStore.update((list) => list.map((n) => (n.id === id ? { ...n, unread } : n)));
  },
  markAllRead() {
    notificationsStore.update((list) => list.map((n) => ({ ...n, unread: false })));
  },
  remove(id: string) {
    notificationsStore.update((list) => list.filter((n) => n.id !== id));
  },
  clearRead() {
    notificationsStore.update((list) => list.filter((n) => n.unread));
  },
};

export function useNotifications() {
  const items = useObservableStore(notificationsStore);
  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);
  return { items, unreadCount };
}

/** "2 min ago", "3 h ago", "Yesterday 17:30", "4 Aug" — relative to the demo clock. */
export function relativeTime(iso: string): string {
  const at = new Date(iso);
  const minutes = Math.round((DEMO_NOW.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 12) return `${Math.round(minutes / 60)} h ago`;
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Phnom_Penh' });
  if (dayGroup(iso) === 'Today') return `Today ${time}`;
  if (dayGroup(iso) === 'Yesterday') return `Yesterday ${time}`;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Phnom_Penh' });
}

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' });

export function dayGroup(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const day = dayKey(new Date(iso));
  if (day === dayKey(DEMO_NOW)) return 'Today';
  if (day === dayKey(new Date(DEMO_NOW.getTime() - 86400_000))) return 'Yesterday';
  return 'Earlier';
}
