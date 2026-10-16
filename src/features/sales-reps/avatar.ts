/** Two initials from a display name, for the avatar. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A stable avatar colour per account.
 *
 * Hashed from the id rather than stored: an avatar colour is a rendering concern, and
 * the platform rightly has no column for it. The same person keeps the same colour
 * across reloads and across machines.
 */
const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-sky-500 to-sky-600',
  'from-green-500 to-green-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-indigo-500 to-indigo-600',
  'from-rose-500 to-rose-600',
  'from-teal-500 to-teal-600',
];

export function gradientFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
