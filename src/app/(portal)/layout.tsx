import { LayoutProvider } from '@/lib/layout/layout-context';
import { LayoutManager } from '@/components/layout/layout-manager';
import { LocationReporter } from '@/components/layout/location-reporter';
import { AuthGuard, ProfileMenu } from '@/features/auth';
import { NotificationsBell } from '@/features/notifications';

/**
 * Every portal route sits behind the guard. The shell is not mounted until a
 * session exists and the role is authorised for the requested path, so no
 * protected screen can paint first — including on a direct URL entry.
 *
 * `LayoutManager` chooses which workspace shell wraps the page. It sits inside
 * the guard, so switching a layout can never widen access: the session and the
 * permission check above it are untouched by the choice.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <LayoutProvider>
        {/* Inside the guard: only a signed-in session has anything to report against. */}
        <LocationReporter />
        <LayoutManager profileMenu={<ProfileMenu />} notifications={<NotificationsBell />}>{children}</LayoutManager>
      </LayoutProvider>
    </AuthGuard>
  );
}
