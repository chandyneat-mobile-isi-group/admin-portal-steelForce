/**
 * Sign-in surfaces, route guards, and the session menu.
 *
 * This is the feature's public API. Other features and routes import from
 * `@/features/auth` and nothing deeper — reaching into an internal path
 * couples callers to a layout that is free to change behind this barrel.
 */
export * from './components/error-page';
export * from './components/guards';
export * from './components/login-form';
export * from './components/profile-menu';
export * from './components/splash-screen';
