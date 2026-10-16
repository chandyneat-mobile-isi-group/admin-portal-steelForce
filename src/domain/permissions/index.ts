import type { Permission } from '../enums/auth';

/**
 * Pure permission checks with wildcard and synonym resolution.
 * Supports:
 * - Full system wildcard: '*' or 'admin'
 * - Module wildcard: '<module>.*'
 * - Module manage grant: '<module>.manage' grants read/view
 * - Synonyms: 'read' <-> 'view'
 */

export function hasPermission(permissions: readonly Permission[], required: Permission): boolean {
  if (!required) return true;

  // Superuser / global wildcard
  if (
    permissions.includes('*') ||
    permissions.includes('admin') ||
    permissions.includes('Administrator') ||
    permissions.includes('all')
  ) {
    return true;
  }

  // Exact match
  if (permissions.includes(required)) {
    return true;
  }

  const parts = required.split('.');
  if (parts.length < 2) return false;
  const [reqModule, reqAction] = parts;

  // Module wildcard e.g. "users.*"
  if (permissions.includes(`${reqModule}.*`)) {
    return true;
  }

  // Module manage grants read/view
  if (permissions.includes(`${reqModule}.manage`)) {
    return true;
  }

  // Read/view synonyms
  if (reqAction === 'read' && permissions.includes(`${reqModule}.view`)) {
    return true;
  }
  if (reqAction === 'view' && permissions.includes(`${reqModule}.read`)) {
    return true;
  }

  // If only reading/viewing a page, having any permission in that module allows access
  if (reqAction === 'read' || reqAction === 'view') {
    return permissions.some((p) => p.startsWith(`${reqModule}.`));
  }

  return false;
}

export function hasAnyPermission(permissions: readonly Permission[], required: readonly Permission[]): boolean {
  if (required.length === 0) return true;
  return required.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(permissions: readonly Permission[], required: readonly Permission[]): boolean {
  return required.every((p) => hasPermission(permissions, p));
}
