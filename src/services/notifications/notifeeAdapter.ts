/**
 * notifeeAdapter — the only module that touches @notifee/react-native. Powers
 * the "quiet hum": a local notification when the GPS watch senses an
 * undiscovered secret nearby. Provider-agnostic via NotificationAdapter so
 * features never import notifee directly.
 */
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

import type { NearbyNotification, NotificationAdapter } from './types';

/** Android requires a channel; created lazily before the first display. */
const CHANNEL_ID = 'nearby-secrets';
const CHANNEL_NAME = 'Nearby secrets';

let channelReady: Promise<string> | null = null;

function ensureChannel(): Promise<string> {
  if (!channelReady) {
    channelReady = notifee.createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      // "Quiet hum" — present but unobtrusive: no heads-up, no loud sound.
      importance: AndroidImportance.LOW,
    });
  }
  return channelReady;
}

/** Round to a friendly "X m away" figure for the body copy. */
function metersLabel(m: number): string {
  return `${Math.round(m / 10) * 10} m away`;
}

export const notifeeAdapter: NotificationAdapter = {
  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  },

  async notifyNearbySecret(n: NearbyNotification): Promise<void> {
    await ensureChannel();
    await notifee.displayNotification({
      // Keyed by secret so the same nearby drop won't stack duplicates.
      id: `nearby-${n.secretId}`,
      title: 'A secret is near',
      body: `Someone left something ${metersLabel(n.distanceM)}. Walk closer to read it.`,
      data: { secretId: n.secretId },
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.LOW,
        pressAction: { id: 'default' },
      },
    });
  },

  async cancelAll(): Promise<void> {
    await notifee.cancelAllNotifications();
  },
};
