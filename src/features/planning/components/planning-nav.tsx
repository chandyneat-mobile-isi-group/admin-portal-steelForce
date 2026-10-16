'use client';

import { usePlanning } from '@/features/planning/store';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ClipboardCheck,
  GitCompareArrows,
  LayoutGrid,
  Map as MapIcon,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The planning tabs answer one question: what are the sales reps supposed to do?
 *
 * Removed from the tabs but still reachable by URL: `/planning/stops` (Today's Stops),
 * `/planning/analytics` (Reports), `/planning/board` (Visit Plans), `/planning/schedules`
 * (Schedules), `/planning/reps` (Planned Routes) and `/planning/activities` (Planned
 * Activities). Add a line back to TABS to restore one.
 */
const TABS = [
  { href: '/planning', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/planning/call-plans', label: 'Upload Call Plans', icon: Upload },
  { href: '/planning/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/planning/map', label: 'Preview Map', icon: MapIcon },
  { href: '/planning/plan-vs-actual', label: 'Plan vs Actual', icon: GitCompareArrows },
];

export function PlanningNav() {
  const pathname = usePathname();
  const { setSummaryOpen, kpis, published } = usePlanning();

  return (
    <div className="flex items-center gap-3 mb-6">
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        {TABS.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-main'
              }`}
            >
              <tab.icon size={15} strokeWidth={isActive ? 2.4 : 1.9} />
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="planning-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-accent/50 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setSummaryOpen(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl gradient-primary text-white text-[12px] font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.97] transition-transform"
      >
        <ClipboardCheck size={14} />
        <span className="hidden sm:inline">Plan summary</span>
        <span className="px-1.5 py-px rounded-md bg-white/25 text-[10px] font-bold tabular-nums">
          {kpis.assigned}
        </span>
        {published && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
      </button>
    </div>
  );
}
