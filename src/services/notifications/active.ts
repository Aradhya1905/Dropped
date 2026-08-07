/**
 * The adapter the app actually uses. Kept in its own module (rather than in
 * `index.ts`) so `hum.ts` can depend on it without an import cycle through the
 * barrel that re-exports `hum` itself.
 */
import { notifeeAdapter } from './notifeeAdapter';
import type { NotificationAdapter } from './types';

/** The active adapter. Swap here, not at any call site. */
export const notifications: NotificationAdapter = notifeeAdapter;
