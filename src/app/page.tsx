'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { landingRouteFor } from '@/lib/auth/authorization';
import { SplashScreen } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Entry route. Resolves the session first, then sends the user to the landing
 * page their role actually has — never straight to the dashboard on faith.
 */
export default function Home() {
  const { status, isAuthenticated, permissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'initializing') return;
    router.replace(isAuthenticated ? landingRouteFor(permissions) : '/login');
  }, [status, isAuthenticated, permissions, router]);

  return <SplashScreen />;
}
