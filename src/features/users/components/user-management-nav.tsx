'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  KeyRound,
  Building2,
  ScrollText,
  LogIn,
  Settings,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const tabs = [
  { href: '/user-management/users', labelKey: 'um.tab.users', icon: Users },
  { href: '/user-management/roles', labelKey: 'um.tab.roles', icon: Shield },
  { href: '/user-management/permissions', labelKey: 'um.tab.permissions', icon: KeyRound },
  { href: '/user-management/departments', labelKey: 'um.tab.departments', icon: Building2 },
  { href: '/user-management/activity-logs', labelKey: 'um.tab.activityLogs', icon: ScrollText },
  { href: '/user-management/login-history', labelKey: 'um.tab.loginHistory', icon: LogIn },
];

export function UserManagementNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-main hover:bg-accent/50'
            }`}
          >
            <tab.icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
            {t(tab.labelKey)}
            {isActive && (
              <motion.div
                layoutId="um-tab-indicator"
                className="absolute inset-0 rounded-xl bg-accent/50 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
