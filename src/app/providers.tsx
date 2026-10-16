'use client';

import { ThemeProvider } from '@/components/shared/theme-provider';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * The client provider chain, kept out of the root layout so `layout.tsx` stays a
 * Server Component and can keep exporting `metadata`. Order matters: theme and
 * locale wrap auth, and auth sits above the router so the login screen, the
 * error pages, and the portal all read one session.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              if (error?.status >= 400 && error?.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange={false}
      >
        <I18nProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
