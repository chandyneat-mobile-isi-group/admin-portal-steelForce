import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { LAYOUT_INIT_SCRIPT } from '@/lib/layout/layout-script';

export const metadata: Metadata = {
  title: 'SteelForce — Admin Portal',
  description: 'Premium steel distribution and sales management platform',
  icons: { icon: '/logos/Square.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resolves the stored workspace shell onto <html data-layout> before
            paint, so the portal never renders one layout and then swaps to
            another. The theme does the same thing via next-themes. */}
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
