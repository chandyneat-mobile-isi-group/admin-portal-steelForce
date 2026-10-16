/**
 * Portal notifications — the feed behind the header bell and `/notifications`.
 *
 * The feature's public API: import from `@/features/notifications` only.
 */
export * from './data/notifications';
export * from './store';
export { notificationVisual } from './components/notification-visuals';
export { NotificationsBell } from './components/notifications-bell';
