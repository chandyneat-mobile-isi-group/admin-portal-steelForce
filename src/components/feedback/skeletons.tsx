'use client';

import { Card } from '@/components/ui/card';

/** Shimmer block using the shell's existing `.skeleton` utility. */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function StopCardSkeleton() {
  return (
    <Card className="p-4 rounded-card border-surface card-shadow">
      <div className="flex items-start gap-3">
        <Bar className="w-10 h-10 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-2/3" />
          <Bar className="h-2.5 w-1/3" />
          <div className="flex gap-1.5 pt-1">
            <Bar className="h-4 w-14 rounded-full" />
            <Bar className="h-4 w-20 rounded-full" />
          </div>
          <Bar className="h-2.5 w-1/2" />
        </div>
      </div>
    </Card>
  );
}

export function RepCardSkeleton() {
  return (
    <Card className="p-4 rounded-card border-surface card-shadow">
      <div className="flex items-start gap-3">
        <Bar className="w-11 h-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-1/2" />
          <Bar className="h-2.5 w-2/3" />
        </div>
      </div>
      <Bar className="h-1.5 w-full mt-4 rounded-full" />
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Bar className="h-6" />
        <Bar className="h-6" />
        <Bar className="h-6" />
      </div>
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <Card className="p-4 rounded-card border-surface card-shadow">
      <Bar className="w-10 h-10 rounded-2xl mb-4" />
      <Bar className="h-2.5 w-1/2 mb-2" />
      <Bar className="h-6 w-2/3" />
    </Card>
  );
}

export function SkeletonList({
  count = 4,
  variant = 'stop',
}: {
  count?: number;
  variant?: 'stop' | 'rep' | 'kpi';
}) {
  const Item = variant === 'rep' ? RepCardSkeleton : variant === 'kpi' ? KpiSkeleton : StopCardSkeleton;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </>
  );
}
