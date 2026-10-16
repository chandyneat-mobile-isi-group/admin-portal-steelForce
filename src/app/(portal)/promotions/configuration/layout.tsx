'use client';

/**
 * Promotions → Configuration: the catalogue behind the promotion form.
 *
 * Types and condition definitions used to be hard-coded in the portal; they are now
 * rows maintained here, so a new type or condition reaches the form, the filters and
 * the rule builder without a deploy. Guarded by `promotions.configure` in the route
 * rules; the server enforces it again on every write.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ListFilter, Shapes } from 'lucide-react';
import { PageBody } from '@/components/layout/page-layout';

const TABS = [
  { href: '/promotions/configuration/types', label: 'Promotion types', icon: Shapes },
  { href: '/promotions/configuration/conditions', label: 'Conditions', icon: ListFilter },
];

export default function PromotionConfigurationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PageBody>
      <div>
        <Link href="/promotions" className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-main">
          <ArrowLeft size={13} /> Promotions & Discounts
        </Link>
        <h1 className="mt-2 text-[20px] font-bold text-main">Promotion settings</h1>
        <p className="text-[12.5px] text-muted-foreground">
          The types and conditions every promotion is built from. Changes here appear in the promotion form immediately.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-surface">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-main'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </PageBody>
  );
}
