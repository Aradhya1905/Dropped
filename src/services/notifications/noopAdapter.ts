import type { NotificationAdapter } from './types';

/**
 * No-op NotificationAdapter. Lets the app compile/run before a local
 * notification package is chosen/installed. Swap for a notifee impl later —
 * parallels how `services/maps` waited on a provider.
 */
export const noopAdapter: NotificationAdapter = {
  async requestPermission(): Promise<boolean> {
    return false;
  },
  async notifyNearbySecret(): Promise<void> {},
  async cancelAll(): Promise<void> {},
};
