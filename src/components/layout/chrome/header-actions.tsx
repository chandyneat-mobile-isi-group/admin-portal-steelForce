'use client';

/**
 * Notifications and the session menu.
 *
 * Every shell needs the same set in the same order. Both controls are slots:
 * shared chrome must not import from a feature (see
 * docs/skills/folder-structure.md), so the portal layout injects the
 * notifications bell and the profile menu.
 */
export function HeaderActions({
  profileMenu,
  notifications,
}: {
  profileMenu?: React.ReactNode;
  notifications?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {notifications}
      {profileMenu}
    </div>
  );
}
