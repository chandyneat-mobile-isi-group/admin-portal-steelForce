/**
 * Role presentation and demo grants.
 *
 * The pure permission checks live in `@/domain/permissions` — they are
 * framework-free and take no view on how a role is labelled. This module is the
 * app-layer companion: badge styling, human-readable role names, and the demo
 * grant table. Importing it from `domain/` would invert the dependency.
 */
export {
  DEMO_ROLE_PERMISSIONS,
  demoPermissionsFor,
  roleMetaFor,
  type RoleMeta,
} from './role-meta';
