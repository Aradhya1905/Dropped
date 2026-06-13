export type { NotificationAdapter, NearbyNotification } from './types';
export { noopAdapter } from './noopAdapter';
export { notifeeAdapter } from './notifeeAdapter';

import { notifeeAdapter } from './notifeeAdapter';

/** The active adapter features should use. */
export const notifications = notifeeAdapter;
