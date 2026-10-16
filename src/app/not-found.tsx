'use client';

import { ErrorPage } from '@/features/auth';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="This page doesn't exist"
      description="The link may be out of date, or the page may have been moved or renamed."
      icon={Compass}
      tone="#004A98"
    />
  );
}
