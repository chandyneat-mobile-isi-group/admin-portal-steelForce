'use client';

import { ErrorPage } from '@/features/auth';
import { ShieldOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Forbidden() {
  const from = useSearchParams().get('from');
  return (
    <ErrorPage
      code="403"
      title="You don't have access to this page"
      description="Your role doesn't include permission for this module. If you need it, ask an administrator to update your access."
      icon={ShieldOff}
      tone="#C33A50"
      detail={from ?? undefined}
    />
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={null}>
      <Forbidden />
    </Suspense>
  );
}
