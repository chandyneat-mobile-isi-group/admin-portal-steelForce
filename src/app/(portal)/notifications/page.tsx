'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Bell, CheckCheck, Mail, MailOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/feedback/feedback';
import {
  dayGroup,
  notificationActions,
  notificationVisual,
  relativeTime,
  useNotifications,
  type PortalNotification,
} from '@/features/notifications';

const FILTERS: Array<{ label: string; match: (n: PortalNotification) => boolean }> = [
  { label: 'All', match: () => true },
  { label: 'Unread', match: (n) => n.unread },
  { label: 'Orders', match: (n) => n.type === 'order' },
  { label: 'Quotations', match: (n) => n.type === 'quotation' },
  { label: 'Payments', match: (n) => n.type === 'payment' },
  { label: 'Visits', match: (n) => n.type === 'visit' },
  { label: 'Depots', match: (n) => n.type === 'depot' },
  { label: 'System', match: (n) => n.type === 'system' },
  { label: 'Alerts', match: (n) => n.type === 'stock' || n.tone === 'warning' || n.tone === 'critical' },
];

const GROUPS = ['Today', 'Yesterday', 'Earlier'] as const;

export default function NotificationsPage() {
  const router = useRouter();
  const { items, unreadCount } = useNotifications();
  const [filter, setFilter] = useState('All');
  const [confirmClear, setConfirmClear] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.label, items.filter(f.match).length])),
    [items]
  );

  const groups = useMemo(() => {
    const match = FILTERS.find((f) => f.label === filter)?.match ?? (() => true);
    const visible = items.filter(match);
    return GROUPS.map((label) => ({ label, items: visible.filter((n) => dayGroup(n.at) === label) })).filter((g) => g.items.length > 0);
  }, [items, filter]);

  const readCount = items.length - unreadCount;

  const open = (n: PortalNotification) => {
    if (n.unread) notificationActions.setUnread(n.id, false);
    router.push(n.href);
  };

  const remove = (n: PortalNotification) => {
    notificationActions.remove(n.id);
    toast.success('Notification deleted', { description: n.title });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Bell size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-[16px] font-700 text-gray-900 dark:text-white" style={{ fontWeight: 700 }}>Notification Center</h2>
            <p className="text-[12px] text-gray-400">{unreadCount} unread notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {readCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-[12px] text-gray-500 font-600 hover:text-rose-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Delete read
            </button>
          )}
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => {
              notificationActions.markAllRead();
              toast.success('All notifications marked as read');
            }}
            className="inline-flex items-center gap-1 text-[12px] text-blue-600 font-600 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontWeight: 600 }}
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filter notifications">
        {FILTERS.map(({ label }) => (
          <button
            key={label}
            role="tab"
            aria-selected={filter === label}
            onClick={() => setFilter(label)}
            className={`px-4 py-2 rounded-xl text-[12px] font-500 whitespace-nowrap transition-all duration-200 ${filter === label ? 'gradient-primary text-white shadow-md shadow-blue-200' : 'text-gray-500 bg-white dark:bg-card card-shadow hover:text-blue-600'}`}
            style={{ fontWeight: 500 }}
          >
            {label}
            <span className={`ml-1.5 text-[10.5px] ${filter === label ? 'text-white/80' : 'text-gray-400'}`}>{counts[label]}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="p-10 border-gray-100 card-shadow text-center" style={{ borderRadius: '16px' }}>
          <p className="text-[13px] font-semibold text-main">Nothing here</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {filter === 'Unread' ? "You're all caught up." : 'No notifications in this category.'}
          </p>
        </Card>
      )}

      {/* Notification Groups */}
      {groups.map((group, gIdx) => (
        <div key={group.label} className="space-y-2">
          <p className="text-[11px] font-600 uppercase tracking-widest text-gray-400 px-1" style={{ fontWeight: 600 }}>{group.label}</p>
          {group.items.map((item, i) => {
            const visual = notificationVisual(item);
            return (
              <Card
                key={item.id}
                role="link"
                tabIndex={0}
                onClick={() => open(item)}
                onKeyDown={(e) => e.key === 'Enter' && open(item)}
                className={`group p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0 ${item.unread ? 'border-l-4 border-l-blue-400' : ''}`}
                style={{ borderRadius: '16px', animationDelay: `${gIdx * 100 + Math.min(i, 8) * 50}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.bg}`}>
                    <visual.icon size={18} className={visual.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-600 text-gray-900 dark:text-white" style={{ fontWeight: item.unread ? 700 : 600 }}>{item.title}</p>
                      {item.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{relativeTime(item.at)}</p>
                  </div>
                  <div
                    className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => notificationActions.setUnread(item.id, !item.unread)}
                      title={item.unread ? 'Mark as read' : 'Mark as unread'}
                      aria-label={item.unread ? `Mark "${item.title}" as read` : `Mark "${item.title}" as unread`}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:bg-accent/60 hover:text-blue-600"
                    >
                      {item.unread ? <MailOpen size={15} /> : <Mail size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      title="Delete"
                      aria-label={`Delete "${item.title}"`}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      <ConfirmDialog
        open={confirmClear}
        title="Delete read notifications?"
        body={`${readCount} read notification${readCount === 1 ? '' : 's'} will be removed. Unread ones are kept.`}
        confirmLabel="Delete read"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          notificationActions.clearRead();
          setConfirmClear(false);
          toast.success('Read notifications deleted');
        }}
      />
    </div>
  );
}
